import crypto from 'crypto';
import { Role, CaseStatus, AuditAction } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser, PaginatedResult } from '../shared/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../shared/errors';
import { caseEventsService } from '../case-events/case-events.service';
import { auditService } from '../audit/audit.service';
import { GAPSENSE_CONFIG } from '../shared/constants';
import { CreateReferralInput, UpdateReferralInput, ListReferralsQuery, AddCaseEventInput } from './referrals.schema';

export class ReferralsService {
  /**
   * Generates a unique, standardized maternal case identifier: JS-YYYY-NNNNNN
   */
  generateCaseId(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `JS-${year}-${randomHex}`;
  }

  /**
   * Generates a privacy-preserving hash for patient identity
   */
  hashPatientName(name: string, externalId: string): string {
    return crypto.createHash('sha256').update(`${name.trim().toLowerCase()}:${externalId}`).digest('hex');
  }

  /**
   * Create or draft a new maternal referral case
   */
  async createReferral(
    input: CreateReferralInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Idempotency check: replay existing case if duplicate idempotencyKey is supplied
    if (idempotencyKey) {
      const existingEvent = await caseEventsService.findByIdempotencyKey(idempotencyKey);
      if (existingEvent?.case) {
        return existingEvent.case;
      }
    }

    // 2. Role authorization check
    const allowedRoles: Role[] = [Role.FRONTLINE_WORKER, Role.SENDING_FACILITY, Role.ADMINISTRATOR];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' is not authorized to create referrals`);
    }

    // 3. Verify sending facility scope
    if (user.facilityId && user.facilityId !== input.sendingFacilityId && user.role !== Role.ADMINISTRATOR) {
      throw new ForbiddenError('You can only create referrals originating from your assigned facility');
    }

    // 4. Create or update synthetic PatientReference
    const nameHash = this.hashPatientName(input.patientName || input.patientExternalId, input.patientExternalId);
    const patient = await prisma.patientReference.upsert({
      where: { externalId: input.patientExternalId },
      update: {
        nameHash,
        age: input.patientAge,
        gravida: input.gravida,
        parity: input.parity,
        lmp: input.lmp ? new Date(input.lmp) : undefined,
        edd: input.edd ? new Date(input.edd) : undefined,
        riskFlags: input.riskFlags,
      },
      create: {
        externalId: input.patientExternalId,
        nameHash,
        age: input.patientAge,
        gravida: input.gravida,
        parity: input.parity,
        lmp: input.lmp ? new Date(input.lmp) : undefined,
        edd: input.edd ? new Date(input.edd) : undefined,
        riskFlags: input.riskFlags,
      },
    });

    // 5. Compute initial status and deadlines
    const initialStatus = input.isDraft ? CaseStatus.DRAFT : CaseStatus.ACKNOWLEDGEMENT_PENDING;
    const now = new Date();
    const acknowledgementDeadline = input.isDraft
      ? null
      : new Date(now.getTime() + GAPSENSE_CONFIG.DEFAULT_ACKNOWLEDGEMENT_TIMEOUT_MINUTES * 60 * 1000);

    const caseId = this.generateCaseId();

    // 6. Create ReferralCase
    const createdCase = await prisma.referralCase.create({
      data: {
        caseId,
        patientId: patient.id,
        sendingFacilityId: input.sendingFacilityId,
        receivingFacilityId: input.receivingFacilityId || null,
        status: initialStatus,
        riskFlags: input.riskFlags,
        transportNeeded: input.transportNeeded,
        transportMode: input.transportMode || null,
        clinicalSummary: input.clinicalSummary || null,
        createdById: user.id,
        acknowledgementDeadline,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // 7. Append immutable CaseEvent
    const eventType = input.isDraft ? 'CREATED' : 'SUBMITTED';
    await caseEventsService.recordEvent({
      caseId: createdCase.id,
      type: eventType,
      fromStatus: null,
      toStatus: initialStatus,
      actorId: user.id,
      actorRole: user.role,
      facilityId: input.sendingFacilityId,
      payload: {
        patientExternalId: input.patientExternalId,
        riskFlags: input.riskFlags,
        transportNeeded: input.transportNeeded,
        transportMode: input.transportMode,
        isDraft: input.isDraft,
      },
      idempotencyKey,
      requestId,
    });

    // 8. Record audit log
    await auditService.record({
      actorId: user.id,
      action: AuditAction.CREATE,
      entity: 'ReferralCase',
      entityId: createdCase.id,
      after: {
        caseId: createdCase.caseId,
        status: createdCase.status,
        sendingFacilityId: createdCase.sendingFacilityId,
        receivingFacilityId: createdCase.receivingFacilityId,
      },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return createdCase;
  }

  /**
   * List referrals scoped to user role and facility/district
   */
  async listReferrals(query: ListReferralsQuery, user: AuthUser): Promise<PaginatedResult<any>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // 1. Role-based Scope Enforcement
    if (user.role === Role.FRONTLINE_WORKER) {
      where.OR = [
        { createdById: user.id },
        { assignedToId: user.id },
        ...(user.facilityId ? [{ sendingFacilityId: user.facilityId }] : []),
      ];
    } else if (user.role === Role.SENDING_FACILITY) {
      where.sendingFacilityId = user.facilityId;
    } else if (user.role === Role.RECEIVING_FACILITY || user.role === Role.CLINICIAN) {
      where.receivingFacilityId = user.facilityId;
    } else if (user.role === Role.DISTRICT_SUPERVISOR) {
      if (user.district) {
        where.OR = [
          { sendingFacility: { district: user.district } },
          { receivingFacility: { district: user.district } },
        ];
      }
    }
    // Administrator & Clinical Administrator have statewide visibility

    // 2. Query Filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.facilityId) {
      where.OR = [{ sendingFacilityId: query.facilityId }, { receivingFacilityId: query.facilityId }];
    }

    if (query.district) {
      where.OR = [
        { sendingFacility: { district: query.district } },
        { receivingFacility: { district: query.district } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (query.dateFrom) createdAtFilter.gte = new Date(query.dateFrom);
      if (query.dateTo) createdAtFilter.lte = new Date(query.dateTo);
      where.createdAt = createdAtFilter;
    }

    const [items, total] = await Promise.all([
      prisma.referralCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          sendingFacility: true,
          receivingFacility: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.referralCase.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single referral case with scope check
   */
  async getReferralById(id: string, user: AuthUser) {
    const referral = await prisma.referralCase.findFirst({
      where: {
        OR: [{ id }, { caseId: id }],
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!referral) {
      throw new NotFoundError('ReferralCase', id);
    }

    // Enforce role scope on single case retrieval
    if (user.role === Role.FRONTLINE_WORKER) {
      const isCreator = referral.createdById === user.id;
      const isAssignee = referral.assignedToId === user.id;
      const isFacility = user.facilityId && referral.sendingFacilityId === user.facilityId;
      if (!isCreator && !isAssignee && !isFacility) {
        throw new ForbiddenError('You can only view cases within your assigned scope');
      }
    } else if (user.role === Role.SENDING_FACILITY) {
      if (user.facilityId && referral.sendingFacilityId !== user.facilityId) {
        throw new ForbiddenError('You can only view referrals sent by your facility');
      }
    } else if (user.role === Role.RECEIVING_FACILITY || user.role === Role.CLINICIAN) {
      if (user.facilityId && referral.receivingFacilityId !== user.facilityId) {
        throw new ForbiddenError('You can only view referrals routed to your facility');
      }
    } else if (user.role === Role.DISTRICT_SUPERVISOR) {
      const matchesSending = referral.sendingFacility?.district === user.district;
      const matchesReceiving = referral.receivingFacility?.district === user.district;
      if (user.district && !matchesSending && !matchesReceiving) {
        throw new ForbiddenError('You can only view referrals within your district');
      }
    }

    return referral;
  }

  /**
   * Update permitted operational fields on a referral case
   */
  async updateReferral(
    id: string,
    data: UpdateReferralInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.getReferralById(id, user);

    // Prevent receiving facility from modifying sender-only fields
    if (user.role === Role.RECEIVING_FACILITY || user.role === Role.CLINICIAN) {
      if (data.riskFlags || data.clinicalSummary) {
        throw new ForbiddenError('Receiving facilities cannot modify sender-only fields');
      }
    }

    const updated = await prisma.referralCase.update({
      where: { id: existing.id },
      data: {
        ...(data.receivingFacilityId !== undefined && { receivingFacilityId: data.receivingFacilityId }),
        ...(data.riskFlags !== undefined && { riskFlags: data.riskFlags }),
        ...(data.transportNeeded !== undefined && { transportNeeded: data.transportNeeded }),
        ...(data.transportMode !== undefined && { transportMode: data.transportMode }),
        ...(data.clinicalSummary !== undefined && { clinicalSummary: data.clinicalSummary }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
      },
    });

    // Append immutable CaseEvent for the modification
    await caseEventsService.recordEvent({
      caseId: existing.id,
      type: 'UPDATED',
      fromStatus: existing.status,
      toStatus: updated.status,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: data as Record<string, unknown>,
      idempotencyKey,
      requestId,
    });

    // Record audit event
    await auditService.record({
      actorId: user.id,
      action: AuditAction.UPDATE,
      entity: 'ReferralCase',
      entityId: existing.id,
      before: {
        receivingFacilityId: existing.receivingFacilityId,
        transportNeeded: existing.transportNeeded,
        transportMode: existing.transportMode,
      },
      after: {
        receivingFacilityId: updated.receivingFacilityId,
        transportNeeded: updated.transportNeeded,
        transportMode: updated.transportMode,
      },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Append a generic case event (operational note, call attempt, transit beacon)
   */
  async addCaseEvent(
    id: string,
    data: AddCaseEventInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
  ) {
    const existing = await this.getReferralById(id, user);

    return await caseEventsService.recordEvent({
      caseId: existing.id,
      type: data.eventType,
      fromStatus: existing.status,
      toStatus: existing.status,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: data.payload,
      idempotencyKey,
      requestId,
    });
  }

  /**
   * Get complete event timeline in chronological order
   */
  async getTimeline(id: string, user: AuthUser) {
    const existing = await this.getReferralById(id, user);
    return await caseEventsService.getTimelineByCaseId(existing.id);
  }
}

export const referralsService = new ReferralsService();
