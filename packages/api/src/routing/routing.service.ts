import { CaseStatus, AuditAction, Role, GapPhase, GapCauseClass } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { auditService } from '../audit/audit.service';
import { calculateRoutingSuggestions } from './routing.engine';
import { FacilityCandidate } from './routing.types';
import { GAPSENSE_CONFIG } from '../shared/constants';
import { NotFoundError, ForbiddenError } from '../shared/errors';

export interface ConfirmRerouteInput {
  targetFacilityId: string;
  overrideReason?: string;
}

export class RoutingService {
  /**
   * GET /api/v1/referrals/:id/route-suggestions
   * Computes and returns ranked alternate facility suggestions
   */
  async getRouteSuggestions(caseId: string, _user: AuthUser) {
    const targetCase = await prisma.referralCase.findFirst({
      where: { OR: [{ id: caseId }, { caseId }] },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
        events: { orderBy: { createdAt: 'desc' } },
        capacitySignals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!targetCase) {
      throw new Error(`ReferralCase '${caseId}' not found`);
    }

    // Candidate facilities in Karnataka
    const allFacilities = await prisma.facility.findMany({
      where: { isActive: true },
    });

    const candidates: FacilityCandidate[] = allFacilities.map((f) => ({
      id: f.id,
      name: f.name,
      nameKn: f.nameKn,
      district: f.district,
      districtKn: f.districtKn,
      type: f.type,
      specialties: f.specialties || [],
      capacityBeds: f.capacityBeds,
      latitude: f.latitude,
      longitude: f.longitude,
      isActive: f.isActive,
    }));

    const capacityReasonCode = targetCase.capacitySignals[0]?.reasonCode || null;

    const suggestions = calculateRoutingSuggestions({
      caseId: targetCase.id,
      sendingFacilityId: targetCase.sendingFacilityId,
      rejectingFacilityId: targetCase.receivingFacilityId || '',
      district: targetCase.sendingFacility.district,
      riskFlags: targetCase.riskFlags || [],
      capacityReasonCode,
      candidateFacilities: candidates,
    });

    // If no alternates available in network, trigger immediate escalation rather than leaving case in silent limbo
    if (suggestions.length === 0) {
      // Find matching playbook or default
      const playbook = await prisma.playbook.findFirst({
        where: { triggerPhase: GapPhase.CAPACITY, triggerCause: GapCauseClass.CAPACITY, isActive: true },
      });

      if (playbook) {
        // Create emergency gap event
        const gapEvent = await prisma.gapEvent.create({
          data: {
            caseId: targetCase.id,
            facilityId: targetCase.receivingFacilityId,
            phase: GapPhase.CAPACITY,
            causeClass: GapCauseClass.CAPACITY,
            evidence: [{ key: 'NO_ALTERNATE_AVAILABLE', description: 'No alternate referral facility configured in network' }] as any,
            classificationLabel: 'likely cause, pending supervisor review',
            status: 'PENDING_REVIEW',
          },
        });

        // Create Escalation
        await prisma.escalation.create({
          data: {
            caseId: targetCase.id,
            gapEventId: gapEvent.id,
            playbookId: playbook.id,
            status: 'OPEN',
          },
        }).catch(() => {}); // Catch unique constraint if already open
      }

      return {
        hasAlternate: false,
        message: 'no alternate currently configured',
        suggestions: [],
        caseStatus: targetCase.status,
        rejectingFacility: targetCase.receivingFacility,
      };
    }

    // Persist top routing suggestions in database
    for (const sug of suggestions.slice(0, 5)) {
      await prisma.routingSuggestion.upsert({
        where: {
          caseId_suggestedFacilityId: {
            caseId: targetCase.id,
            suggestedFacilityId: sug.suggestedFacilityId,
          },
        },
        create: {
          caseId: targetCase.id,
          suggestedFacilityId: sug.suggestedFacilityId,
          rank: sug.rank,
          score: sug.score,
          reasons: sug.reasons,
          status: 'PENDING',
        },
        update: {
          rank: sug.rank,
          score: sug.score,
          reasons: sug.reasons,
        },
      });
    }

    return {
      hasAlternate: true,
      suggestions,
      caseStatus: targetCase.status,
      rejectingFacility: targetCase.receivingFacility,
      capacityReasonCode,
    };
  }

  /**
   * POST /api/v1/referrals/:id/confirm-reroute
   * Confirms re-route to new destination facility, restarting acknowledgement SLA lifecycle
   */
  async confirmReroute(
    caseId: string,
    input: ConfirmRerouteInput,
    user: AuthUser,
    idempotencyKey?: string,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const targetCase = await prisma.referralCase.findFirst({
      where: { OR: [{ id: caseId }, { caseId }] },
      include: {
        receivingFacility: true,
        events: { orderBy: { createdAt: 'asc' } },
        capacitySignals: true,
      },
    });

    if (!targetCase) {
      throw new NotFoundError('ReferralCase', caseId);
    }

    // Role check: Only Sending Facility (originator), District Supervisor, or Administrator
    const isSendingFacility = user.role === Role.SENDING_FACILITY && user.facilityId === targetCase.sendingFacilityId;
    const isSupervisor = user.role === Role.DISTRICT_SUPERVISOR;
    const isAdmin = user.role === Role.ADMINISTRATOR || user.role === Role.CLINICAL_ADMINISTRATOR;

    if (!isSendingFacility && !isSupervisor && !isAdmin) {
      throw new ForbiddenError(`User in role '${user.role}' is not authorized to confirm re-routes for this case.`);
    }

    const targetFacility = await prisma.facility.findUnique({
      where: { id: input.targetFacilityId },
    });

    if (!targetFacility || !targetFacility.isActive) {
      throw new NotFoundError('Target facility', input.targetFacilityId);
    }

    const previousFacilityId = targetCase.receivingFacilityId;
    const previousFacilityName = targetCase.receivingFacility?.name || 'Previous Facility';

    const now = new Date();
    // Restart acknowledgement SLA clock at new destination
    const newAcknowledgementDeadline = new Date(now.getTime() + GAPSENSE_CONFIG.DEFAULT_ACKNOWLEDGEMENT_TIMEOUT_MINUTES * 60 * 1000);

    // Update case in transaction: append-only, original rejection events remain byte-for-byte untouched
    const updatedCase = await prisma.$transaction(async (tx) => {
      const updated = await tx.referralCase.update({
        where: { id: targetCase.id },
        data: {
          receivingFacilityId: targetFacility.id,
          status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
          acknowledgementDeadline: newAcknowledgementDeadline,
          updatedAt: now,
        },
        include: {
          patient: true,
          sendingFacility: true,
          receivingFacility: true,
        },
      });

      // Append immutable REROUTED CaseEvent
      await tx.caseEvent.create({
        data: {
          caseId: targetCase.id,
          type: 'REROUTED',
          fromStatus: CaseStatus.REDIRECT_SUGGESTED,
          toStatus: CaseStatus.ACKNOWLEDGEMENT_PENDING,
          actorId: user.id,
          actorRole: user.role,
          facilityId: user.facilityId || undefined,
          idempotencyKey,
          requestId,
          payload: {
            previousFacilityId,
            previousFacilityName,
            newFacilityId: targetFacility.id,
            newFacilityName: targetFacility.name,
            overrideReason: input.overrideReason,
            restartedDeadline: newAcknowledgementDeadline.toISOString(),
          } as any,
        },
      });

      // Update routing suggestion status if matched
      await tx.routingSuggestion.updateMany({
        where: {
          caseId: targetCase.id,
          suggestedFacilityId: targetFacility.id,
        },
        data: {
          status: 'CONFIRMED',
          confirmedById: user.id,
          confirmedAt: now,
        },
      });

      return updated;
    });

    // Write immutable security/governance AuditEvent
    await auditService.record({
      action: AuditAction.RE_ROUTE,
      entity: 'ReferralCase',
      entityId: updatedCase.id,
      actorId: user.id,
      before: {
        status: targetCase.status,
        receivingFacilityId: previousFacilityId,
      },
      after: {
        status: updatedCase.status,
        receivingFacilityId: targetFacility.id,
        newAcknowledgementDeadline: newAcknowledgementDeadline.toISOString(),
        overrideReason: input.overrideReason,
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: `Case successfully rerouted to ${targetFacility.name}. Acknowledgement clock restarted.`,
      case: updatedCase,
      acknowledgementDeadline: newAcknowledgementDeadline.toISOString(),
    };
  }
}

export const routingService = new RoutingService();
