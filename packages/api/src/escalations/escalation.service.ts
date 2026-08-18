import { Role, EscalationStatus, PlaybookStepStatus, AuditAction } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { auditService } from '../audit/audit.service';
import { escalationScanner } from './escalation-scanner';

export interface RecordPlaybookStepInput {
  stepId: string;
  notes?: string;
  evidence?: any;
}

export interface ResolveEscalationInput {
  resolutionSummary: string;
}

export class EscalationsService {
  async runScanner() {
    return escalationScanner.scan();
  }

  async getEscalations(query: { status?: EscalationStatus; limit?: number }, user: AuthUser) {
    const whereClause: Record<string, any> = {};

    if (query.status) {
      whereClause.status = query.status;
    }

    if (user.role === Role.DISTRICT_SUPERVISOR && user.district) {
      whereClause.case = {
        OR: [
          { sendingFacility: { district: user.district } },
          { receivingFacility: { district: user.district } },
        ],
      };
    } else if (user.role === Role.SENDING_FACILITY && user.facilityId) {
      whereClause.case = { sendingFacilityId: user.facilityId };
    } else if (user.role === Role.RECEIVING_FACILITY && user.facilityId) {
      whereClause.case = { receivingFacilityId: user.facilityId };
    }

    return prisma.escalation.findMany({
      where: whereClause,
      take: query.limit || 50,
      orderBy: { startedAt: 'desc' },
      include: {
        case: {
          include: {
            patient: true,
            sendingFacility: true,
            receivingFacility: true,
          },
        },
        gapEvent: true,
        playbook: true,
        steps: { orderBy: { stepOrder: 'asc' }, include: { completedBy: true } },
        assignee: true,
      },
    });
  }

  async getEscalationById(id: string, _user: AuthUser) {
    const escalation = await prisma.escalation.findUnique({
      where: { id },
      include: {
        case: {
          include: {
            patient: true,
            sendingFacility: true,
            receivingFacility: true,
            events: { orderBy: { createdAt: 'asc' } },
          },
        },
        gapEvent: true,
        playbook: true,
        steps: { orderBy: { stepOrder: 'asc' }, include: { completedBy: true } },
        assignee: true,
      },
    });

    if (!escalation) {
      throw new Error(`Escalation '${id}' not found`);
    }

    return escalation;
  }

  /**
   * POST /api/v1/escalations/:id/acknowledge
   * Supervisor explicitly acknowledges and takes ownership of the escalation
   */
  async acknowledgeEscalation(
    id: string,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await prisma.escalation.findUnique({
      where: { id },
      include: { case: true, gapEvent: true },
    });

    if (!existing) {
      throw new Error(`Escalation '${id}' not found`);
    }

    const now = new Date();

    const updated = await prisma.escalation.update({
      where: { id },
      data: {
        status: EscalationStatus.IN_PROGRESS,
        assigneeId: user.id,
        acknowledgedAt: now,
      },
      include: {
        case: { include: { patient: true, sendingFacility: true, receivingFacility: true } },
        gapEvent: true,
        playbook: true,
        steps: { orderBy: { stepOrder: 'asc' }, include: { completedBy: true } },
        assignee: true,
      },
    });

    await auditService.record({
      action: AuditAction.ESCALATION,
      entity: 'Escalation',
      entityId: id,
      actorId: user.id,
      before: {
        status: existing.status,
        assigneeId: existing.assigneeId,
      },
      after: {
        status: updated.status,
        assigneeId: updated.assigneeId,
        acknowledgedAt: now,
        actionType: 'ACKNOWLEDGE',
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * POST /api/v1/escalations/:id/playbook-step
   * Record human completion of an approved action playbook step
   */
  async recordPlaybookStep(
    id: string,
    input: RecordPlaybookStepInput,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await prisma.escalation.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!existing) {
      throw new Error(`Escalation '${id}' not found`);
    }

    const step = existing.steps.find((s) => s.id === input.stepId || s.id === input.stepId);
    if (!step) {
      throw new Error(`PlaybookStep '${input.stepId}' not found on escalation '${id}'`);
    }

    const now = new Date();

    const updatedStep = await prisma.playbookStep.update({
      where: { id: step.id },
      data: {
        status: PlaybookStepStatus.COMPLETED,
        completedById: user.id,
        completedAt: now,
        evidence: {
          notes: input.notes,
          submittedEvidence: input.evidence,
        } as any,
      },
      include: {
        completedBy: true,
      },
    });

    // Advance currentStepIndex if this was the current step
    if (step.stepOrder === existing.currentStepIndex + 1) {
      await prisma.escalation.update({
        where: { id },
        data: { currentStepIndex: step.stepOrder },
      });
    }

    await auditService.record({
      action: AuditAction.PLAYBOOK_STEP,
      entity: 'PlaybookStep',
      entityId: step.id,
      actorId: user.id,
      before: {
        status: step.status,
      },
      after: {
        status: updatedStep.status,
        completedById: user.id,
        completedAt: now,
        notes: input.notes,
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return updatedStep;
  }

  /**
   * POST /api/v1/escalations/:id/resolve
   * Supervisor resolves the escalation with explicit human resolution summary
   */
  async resolveEscalation(
    id: string,
    input: ResolveEscalationInput,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await prisma.escalation.findUnique({
      where: { id },
      include: { gapEvent: true },
    });

    if (!existing) {
      throw new Error(`Escalation '${id}' not found`);
    }

    const now = new Date();

    const updated = await prisma.escalation.update({
      where: { id },
      data: {
        status: EscalationStatus.RESOLVED,
        resolvedAt: now,
      },
      include: {
        case: { include: { patient: true, sendingFacility: true, receivingFacility: true } },
        gapEvent: true,
        playbook: true,
        steps: { orderBy: { stepOrder: 'asc' }, include: { completedBy: true } },
        assignee: true,
      },
    });

    // Also mark GapEvent as resolved
    if (existing.gapEventId) {
      await prisma.gapEvent.update({
        where: { id: existing.gapEventId },
        data: { status: 'RESOLVED' },
      });
    }

    await auditService.record({
      action: AuditAction.ESCALATION,
      entity: 'Escalation',
      entityId: id,
      actorId: user.id,
      before: {
        status: existing.status,
      },
      after: {
        status: updated.status,
        resolvedAt: now,
        resolutionSummary: input.resolutionSummary,
        actionType: 'RESOLVE',
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return updated;
  }
}

export const escalationsService = new EscalationsService();
