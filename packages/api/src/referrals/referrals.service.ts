import crypto from 'crypto';
import { Role, CaseStatus, AuditAction, CapacityReasonCode } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser, PaginatedResult } from '../shared/types';
import { NotFoundError, ForbiddenError, ValidationError, InvalidTransitionError } from '../shared/errors';
import { caseEventsService } from '../case-events/case-events.service';
import { auditService } from '../audit/audit.service';
import { capacitiesService } from '../capacities/capacities.service';
import { GAPSENSE_CONFIG } from '../shared/constants';
import {
  CreateReferralInput,
  UpdateReferralInput,
  ListReferralsQuery,
  AddCaseEventInput,
  AcceptReferralInput,
  RedirectReferralInput,
  RejectReferralInput,
  RecordArrivalInput,
} from './referrals.schema';

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

    // Delayed beyond configured window filter (e.g. for supervisors monitoring delayed cases)
    if (query.delayedBeyondMinutes) {
      const cutoff = new Date(Date.now() - query.delayedBeyondMinutes * 60 * 1000);
      where.createdAt = { lte: cutoff };
      where.status = { in: [CaseStatus.ACKNOWLEDGEMENT_PENDING, CaseStatus.IN_TRANSIT] };
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
   * POST /api/v1/referrals/:id/accept
   * Receiving facility accepts the referral
   */
  async acceptReferral(
    id: string,
    input: AcceptReferralInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (idempotencyKey) {
      const existingEvent = await caseEventsService.findByIdempotencyKey(idempotencyKey);
      if (existingEvent?.case) return existingEvent.case;
    }

    const existing = await this.getReferralById(id, user);

    if (existing.status !== CaseStatus.ACKNOWLEDGEMENT_PENDING) {
      throw new InvalidTransitionError(
        `Cannot accept referral with status '${existing.status}' (must be ACKNOWLEDGEMENT_PENDING)`,
      );
    }

    const updated = await prisma.referralCase.update({
      where: { id: existing.id },
      data: {
        status: CaseStatus.ACCEPTED,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
      },
    });

    // Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: existing.id,
      type: 'ACCEPTED',
      fromStatus: existing.status,
      toStatus: CaseStatus.ACCEPTED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: { note: input.note, receivingUnit: input.receivingUnit },
      idempotencyKey,
      requestId,
    });

    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: existing.id,
      before: { status: existing.status },
      after: { status: CaseStatus.ACCEPTED },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * POST /api/v1/referrals/:id/redirect
   * Receiving facility redirects the referral with a capacity reason code
   */
  async redirectReferral(
    id: string,
    input: RedirectReferralInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (idempotencyKey) {
      const existingEvent = await caseEventsService.findByIdempotencyKey(idempotencyKey);
      if (existingEvent?.case) return existingEvent.case;
    }

    const existing = await this.getReferralById(id, user);

    if (existing.status !== CaseStatus.ACKNOWLEDGEMENT_PENDING) {
      throw new InvalidTransitionError(
        `Cannot redirect referral with status '${existing.status}' (must be ACKNOWLEDGEMENT_PENDING)`,
      );
    }

    const redirectingFacilityId = existing.receivingFacilityId || user.facilityId || existing.sendingFacilityId;

    // 1. Write exactly one immutable CapacitySignal
    await capacitiesService.recordCapacitySignal({
      facilityId: redirectingFacilityId,
      reasonCode: input.reasonCode,
      detail: input.note,
      reportedById: user.id,
      caseId: existing.id,
    });

    // 2. Update referral case
    const updated = await prisma.referralCase.update({
      where: { id: existing.id },
      data: {
        status: CaseStatus.REDIRECTED,
        receivingFacilityId: input.targetFacilityId,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
      },
    });

    // 3. Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: existing.id,
      type: 'REDIRECTED',
      fromStatus: existing.status,
      toStatus: CaseStatus.REDIRECTED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: redirectingFacilityId,
      payload: {
        targetFacilityId: input.targetFacilityId,
        reasonCode: input.reasonCode,
        note: input.note,
      },
      idempotencyKey,
      requestId,
    });

    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: existing.id,
      before: { status: existing.status, receivingFacilityId: existing.receivingFacilityId },
      after: { status: CaseStatus.REDIRECTED, receivingFacilityId: input.targetFacilityId },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * POST /api/v1/referrals/:id/reject
   * Receiving facility rejects the referral with capacity reason code
   */
  async rejectReferral(
    id: string,
    input: RejectReferralInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (idempotencyKey) {
      const existingEvent = await caseEventsService.findByIdempotencyKey(idempotencyKey);
      if (existingEvent?.case) return existingEvent.case;
    }

    const existing = await this.getReferralById(id, user);

    if (existing.status !== CaseStatus.ACKNOWLEDGEMENT_PENDING) {
      throw new InvalidTransitionError(
        `Cannot reject referral with status '${existing.status}' (must be ACKNOWLEDGEMENT_PENDING)`,
      );
    }

    const rejectingFacilityId = existing.receivingFacilityId || user.facilityId || existing.sendingFacilityId;

    // 1. Write exactly one immutable CapacitySignal
    await capacitiesService.recordCapacitySignal({
      facilityId: rejectingFacilityId,
      reasonCode: input.reasonCode,
      detail: input.note,
      reportedById: user.id,
      caseId: existing.id,
    });

    // 2. Update referral case status to REJECTED (Do not implement REDIRECT_SUGGESTED here - Phase 9)
    const updated = await prisma.referralCase.update({
      where: { id: existing.id },
      data: {
        status: CaseStatus.REJECTED,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
      },
    });

    // 3. Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: existing.id,
      type: 'REJECTED',
      fromStatus: existing.status,
      toStatus: CaseStatus.REJECTED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: rejectingFacilityId,
      payload: {
        reasonCode: input.reasonCode,
        note: input.note,
      },
      idempotencyKey,
      requestId,
    });

    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: existing.id,
      before: { status: existing.status },
      after: { status: CaseStatus.REJECTED },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * POST /api/v1/referrals/:id/arrival
   * Record patient arrival at the receiving facility
   */
  async recordArrival(
    id: string,
    input: RecordArrivalInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (idempotencyKey) {
      const existingEvent = await caseEventsService.findByIdempotencyKey(idempotencyKey);
      if (existingEvent?.case) return existingEvent.case;
    }

    const existing = await this.getReferralById(id, user);

    // Reject arrival on a case that was never submitted or not active in transit
    if (existing.status === CaseStatus.DRAFT) {
      throw new InvalidTransitionError('Cannot record arrival on a referral case that was never submitted');
    }

    const validArrivalStatuses: CaseStatus[] = [CaseStatus.ACCEPTED, CaseStatus.IN_TRANSIT];
    if (!validArrivalStatuses.includes(existing.status)) {
      throw new InvalidTransitionError(
        `Cannot record patient arrival for a case with status '${existing.status}' (must be ACCEPTED or IN_TRANSIT)`,
      );
    }

    // Update referral status to ARRIVED
    const updated = await prisma.referralCase.update({
      where: { id: existing.id },
      data: {
        status: CaseStatus.ARRIVED,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
      },
    });

    // Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: existing.id,
      type: 'ARRIVED',
      fromStatus: existing.status,
      toStatus: CaseStatus.ARRIVED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: existing.receivingFacilityId,
      payload: {
        arrivedAt: input.arrivedAt || new Date().toISOString(),
        delayReason: input.delayReason || null,
        note: input.note || null,
      },
      idempotencyKey,
      requestId,
    });

    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: existing.id,
      before: { status: existing.status },
      after: { status: CaseStatus.ARRIVED },
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
