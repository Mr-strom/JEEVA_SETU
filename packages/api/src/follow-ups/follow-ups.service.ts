import { Role, CaseStatus, AuditAction } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser, PaginatedResult } from '../shared/types';
import { NotFoundError, ForbiddenError } from '../shared/errors';
import { caseEventsService } from '../case-events/case-events.service';
import { auditService } from '../audit/audit.service';
import { ListFollowUpsQuery, CompleteFollowUpInput, EscalateFollowUpInput } from './follow-ups.schema';

export class FollowUpsService {
  /**
   * GET /api/v1/follow-ups
   * List follow-up tasks scoped to frontline worker, facility, or supervisor
   */
  async listFollowUps(query: ListFollowUpsQuery, user: AuthUser): Promise<PaginatedResult<any>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // 1. Role Scope Enforcement
    if (user.role === Role.FRONTLINE_WORKER) {
      where.ownerId = user.id;
    } else if (user.role === Role.SENDING_FACILITY) {
      where.case = { sendingFacilityId: user.facilityId };
    } else if (user.role === Role.RECEIVING_FACILITY || user.role === Role.CLINICIAN) {
      where.case = { receivingFacilityId: user.facilityId };
    } else if (user.role === Role.DISTRICT_SUPERVISOR) {
      if (user.district) {
        where.case = {
          OR: [
            { sendingFacility: { district: user.district } },
            { receivingFacility: { district: user.district } },
          ],
        };
      }
    }

    // 2. Query Filters
    if (query.caseId) {
      where.caseId = query.caseId;
    }

    const now = new Date();
    if (query.status === 'PENDING') {
      where.outcome = null;
      where.escalated = false;
      where.dueDate = { gte: now };
    } else if (query.status === 'OVERDUE') {
      where.outcome = null;
      where.escalated = false;
      where.dueDate = { lt: now };
    } else if (query.status === 'COMPLETED') {
      where.outcome = { not: null };
    } else if (query.status === 'ESCALATED') {
      where.escalated = true;
    }

    if (query.dueDate) {
      const dateStart = new Date(query.dueDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(query.dueDate);
      dateEnd.setHours(23, 59, 59, 999);
      where.dueDate = { gte: dateStart, lte: dateEnd };
    }

    const [items, total] = await Promise.all([
      prisma.followUpTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          owner: { select: { id: true, name: true, phone: true, role: true } },
          case: {
            include: {
              patient: true,
              sendingFacility: true,
              receivingFacility: true,
            },
          },
        },
      }),
      prisma.followUpTask.count({ where }),
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
   * POST /api/v1/follow-ups/:id/complete
   * Frontline worker records follow-up task completion
   */
  async completeFollowUp(
    id: string,
    input: CompleteFollowUpInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const task = await prisma.followUpTask.findUnique({
      where: { id },
      include: { case: true },
    });

    if (!task) {
      throw new NotFoundError('FollowUpTask', id);
    }

    // 1. Update FollowUpTask
    const completedAt = new Date();
    const updatedTask = await prisma.followUpTask.update({
      where: { id },
      data: {
        outcome: input.outcome,
        completedAt,
        notes: input.notes || task.notes,
      },
    });

    // 2. Update referral case status to FOLLOW_UP_COMPLETED
    await prisma.referralCase.update({
      where: { id: task.caseId },
      data: {
        status: CaseStatus.FOLLOW_UP_COMPLETED,
      },
    });

    // 3. Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: task.caseId,
      type: 'FOLLOW_UP_COMPLETED',
      fromStatus: task.case.status,
      toStatus: CaseStatus.FOLLOW_UP_COMPLETED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: {
        followUpTaskId: task.id,
        outcome: input.outcome,
        notes: input.notes,
      },
      idempotencyKey,
      requestId,
    });

    // 4. Audit Log
    await auditService.record({
      actorId: user.id,
      action: AuditAction.UPDATE,
      entity: 'FollowUpTask',
      entityId: task.id,
      before: { outcome: task.outcome, completedAt: task.completedAt },
      after: { outcome: input.outcome, completedAt },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updatedTask;
  }

  /**
   * POST /api/v1/follow-ups/:id/escalate
   * Escalate overdue or uncontactable follow-up
   */
  async escalateFollowUp(
    id: string,
    input: EscalateFollowUpInput,
    user: AuthUser,
    idempotencyKey?: string | null,
    requestId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const task = await prisma.followUpTask.findUnique({
      where: { id },
      include: { case: true },
    });

    if (!task) {
      throw new NotFoundError('FollowUpTask', id);
    }

    const escalatedAt = new Date();

    // 1. Update FollowUpTask
    const updatedTask = await prisma.followUpTask.update({
      where: { id },
      data: {
        escalated: true,
        escalatedAt,
        notes: input.reason,
      },
    });

    // 2. Update referral case status to FOLLOW_UP_ESCALATED
    await prisma.referralCase.update({
      where: { id: task.caseId },
      data: {
        status: CaseStatus.FOLLOW_UP_ESCALATED,
      },
    });

    // 3. Append immutable CaseEvent
    await caseEventsService.recordEvent({
      caseId: task.caseId,
      type: 'FOLLOW_UP_ESCALATED',
      fromStatus: task.case.status,
      toStatus: CaseStatus.FOLLOW_UP_ESCALATED,
      actorId: user.id,
      actorRole: user.role,
      facilityId: user.facilityId,
      payload: {
        followUpTaskId: task.id,
        reason: input.reason,
      },
      idempotencyKey,
      requestId,
    });

    // 4. Audit Log
    await auditService.record({
      actorId: user.id,
      action: AuditAction.ESCALATION,
      entity: 'FollowUpTask',
      entityId: task.id,
      before: { escalated: task.escalated },
      after: { escalated: true, escalatedAt, reason: input.reason },
      requestId: requestId || undefined,
      ipAddress,
      userAgent,
    });

    return updatedTask;
  }
}

export const followUpsService = new FollowUpsService();
