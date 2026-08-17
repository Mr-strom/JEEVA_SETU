import { Role, CaseStatus, AuditAction, FollowUpType } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { NotFoundError, ForbiddenError, ValidationError, InvalidTransitionError } from '../shared/errors';
import { caseEventsService } from '../case-events/case-events.service';
import { auditService } from '../audit/audit.service';
import { GAPSENSE_CONFIG } from '../shared/constants';
import { RecordDispositionInput, RecordDischargeInput, CloseReferralInput } from './dispositions.schema';

export class DispositionsService {
  /**
   * POST /api/v1/referrals/:id/disposition
   * Clinician-only recording of approved clinical disposition category
   */
  async recordDisposition(
    caseIdOrId: string,
    input: RecordDispositionInput,
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

    // Role check: Strictly clinician or clinical administrator
    if (user.role !== Role.CLINICIAN && user.role !== Role.CLINICAL_ADMINISTRATOR) {
      throw new ForbiddenError(`Only a clinician role can record clinical disposition (attempted by '${user.role}')`);
    }

    const referral = await prisma.referralCase.findFirst({
      where: { OR: [{ id: caseIdOrId }, { caseId: caseIdOrId }] },
    });

    if (!referral) {
      throw new NotFoundError('ReferralCase', caseIdOrId);
    }

    // Must be in ARRIVED status
    if (referral.status !== CaseStatus.ARRIVED) {
      throw new InvalidTransitionError(
        `Cannot record disposition for case with status '${referral.status}' (must be ARRIVED)`,
      );
    }

    // Verify facility scope if clinician is assigned to a facility
    if (user.facilityId && referral.receivingFacilityId && user.facilityId !== referral.receivingFacilityId) {
      throw new ForbiddenError('You can only record disposition for cases routed to your facility');
    }

    // 1. Create or update Disposition record
    await prisma.disposition.upsert({
      where: { caseId: referral.id },
      update: {
        category: input.category,
        detail: input.detail || null,
        recordedById: user.id,
        recordedAt: new Date(),
      },
      create: {
        caseId: referral.id,
        category: input.category,
        detail: input.detail || null,
        recordedById: user.id,
        recordedAt: new Date(),
      },
    });

    // 2. Update referral status
    const updated = await prisma.referralCase.update({
      where: { id: referral.id },
      data: {
        status: CaseStatus.CLINICAL_DISPOSITION_RECORDED,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
        dispositions: true,
      },
    });

    // 3. Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: referral.id,
      type: 'CLINICAL_DISPOSITION_RECORDED',
      fromStatus: referral.status,
      toStatus: CaseStatus.CLINICAL_DISPOSITION_RECORDED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: {
        category: input.category,
        detail: input.detail,
        transferredToFacilityId: input.transferredToFacilityId,
      },
      idempotencyKey,
      requestId,
    });

    // 4. Record audit event
    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: referral.id,
      before: { status: referral.status },
      after: { status: CaseStatus.CLINICAL_DISPOSITION_RECORDED, dispositionCategory: input.category },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * POST /api/v1/referrals/:id/discharge
   * Discharge patient and schedule post-discharge follow-up task
   */
  async recordDischarge(
    caseIdOrId: string,
    input: RecordDischargeInput,
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

    const allowedRoles: Role[] = [Role.CLINICIAN, Role.RECEIVING_FACILITY, Role.ADMINISTRATOR];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' is not authorized to discharge patients`);
    }

    const referral = await prisma.referralCase.findFirst({
      where: { OR: [{ id: caseIdOrId }, { caseId: caseIdOrId }] },
    });

    if (!referral) {
      throw new NotFoundError('ReferralCase', caseIdOrId);
    }

    if (referral.status !== CaseStatus.CLINICAL_DISPOSITION_RECORDED && referral.status !== CaseStatus.ARRIVED) {
      throw new InvalidTransitionError(
        `Cannot discharge case with status '${referral.status}' (must have disposition recorded)`,
      );
    }

    // Default follow-up due date is 3 days post-discharge
    const dueDate = input.followUpDueDate
      ? new Date(input.followUpDueDate)
      : new Date(Date.now() + GAPSENSE_CONFIG.DEFAULT_FOLLOW_UP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Owner defaults to assigned worker or case creator
    const ownerId = input.ownerId || referral.assignedToId || referral.createdById;

    // 1. Create FollowUpTask
    const followUp = await prisma.followUpTask.create({
      data: {
        caseId: referral.id,
        type: input.type || FollowUpType.HOME_VISIT,
        ownerId,
        dueDate,
        notes: input.dischargeSummary || null,
      },
    });

    // 2. Transition ReferralCase to FOLLOW_UP_DUE
    const updated = await prisma.referralCase.update({
      where: { id: referral.id },
      data: {
        status: CaseStatus.FOLLOW_UP_DUE,
        followUpDueDate: dueDate,
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
        followUpTasks: true,
      },
    });

    // 3. Append immutable CaseEvents (DISCHARGED and FOLLOW_UP_DUE)
    await caseEventsService.recordEvent({
      caseId: referral.id,
      type: 'DISCHARGED',
      fromStatus: referral.status,
      toStatus: CaseStatus.DISCHARGED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: { dischargeSummary: input.dischargeSummary },
      idempotencyKey,
      requestId,
    });

    await caseEventsService.recordEvent({
      caseId: referral.id,
      type: 'FOLLOW_UP_DUE',
      fromStatus: CaseStatus.DISCHARGED,
      toStatus: CaseStatus.FOLLOW_UP_DUE,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: { followUpTaskId: followUp.id, dueDate, followUpType: input.type },
      requestId,
    });

    // 4. Audit Log
    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: referral.id,
      before: { status: referral.status },
      after: { status: CaseStatus.FOLLOW_UP_DUE, followUpDueDate: dueDate },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * POST /api/v1/referrals/:id/close
   * Close the referral case (rejects if mandatory follow-up is unresolved)
   */
  async closeReferral(
    caseIdOrId: string,
    input: CloseReferralInput,
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

    const allowedRoles: Role[] = [Role.CLINICIAN, Role.DISTRICT_SUPERVISOR, Role.ADMINISTRATOR];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' is not authorized to close referrals`);
    }

    const referral = await prisma.referralCase.findFirst({
      where: { OR: [{ id: caseIdOrId }, { caseId: caseIdOrId }] },
      include: {
        followUpTasks: true,
      },
    });

    if (!referral) {
      throw new NotFoundError('ReferralCase', caseIdOrId);
    }

    // Strict safety check: verify all follow-up tasks are resolved (completed or escalated)
    const hasUnresolvedFollowUp = referral.followUpTasks.some(
      (task) => task.outcome === null && task.escalated === false,
    );

    if (hasUnresolvedFollowUp) {
      throw new ValidationError('Cannot close referral with unresolved mandatory follow-up task');
    }

    // Transition to CLOSED
    const updated = await prisma.referralCase.update({
      where: { id: referral.id },
      data: {
        status: CaseStatus.CLOSED,
        closedAt: new Date(),
      },
      include: {
        patient: true,
        sendingFacility: true,
        receivingFacility: true,
        followUpTasks: true,
      },
    });

    // Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: referral.id,
      type: 'CLOSED',
      fromStatus: referral.status,
      toStatus: CaseStatus.CLOSED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: { closureReason: input.closureReason, note: input.note },
      idempotencyKey,
      requestId,
    });

    // Record Audit
    await auditService.record({
      actorId: user.id,
      action: AuditAction.TRANSITION,
      entity: 'ReferralCase',
      entityId: referral.id,
      before: { status: referral.status },
      after: { status: CaseStatus.CLOSED, closedAt: updated.closedAt },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updated;
  }
}

export const dispositionsService = new DispositionsService();
