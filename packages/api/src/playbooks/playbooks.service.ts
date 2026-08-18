import { AuditAction, GapPhase, GapCauseClass } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { auditService } from '../audit/audit.service';
import { NotFoundError } from '../shared/errors';
import { CreatePlaybookInput, UpdatePlaybookInput } from './playbooks.schema';

export class PlaybooksService {
  async listPlaybooks(query?: { phase?: GapPhase; cause?: GapCauseClass; activeOnly?: boolean }) {
    const where: Record<string, any> = {};
    if (query?.phase) where.triggerPhase = query.phase;
    if (query?.cause) where.triggerCause = query.cause;
    if (query?.activeOnly !== false) where.isActive = true;

    return prisma.playbook.findMany({
      where,
      orderBy: [{ triggerPhase: 'asc' }, { triggerCause: 'asc' }],
    });
  }

  async getPlaybookById(id: string) {
    const playbook = await prisma.playbook.findUnique({
      where: { id },
    });
    if (!playbook) {
      throw new NotFoundError('Playbook', id);
    }
    return playbook;
  }

  async getPlaybookByTrigger(phase: GapPhase, cause: GapCauseClass) {
    return prisma.playbook.findFirst({
      where: {
        triggerPhase: phase,
        triggerCause: cause,
        isActive: true,
      },
    });
  }

  async createPlaybook(
    input: CreatePlaybookInput,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const playbook = await prisma.playbook.create({
      data: {
        name: input.name,
        nameKn: input.nameKn,
        triggerPhase: input.triggerPhase,
        triggerCause: input.triggerCause,
        stepTemplates: input.stepTemplates as any,
        isActive: input.isActive ?? true,
      },
    });

    await auditService.record({
      action: AuditAction.CREATE,
      entity: 'Playbook',
      entityId: playbook.id,
      actorId: user.id,
      after: {
        name: playbook.name,
        triggerPhase: playbook.triggerPhase,
        triggerCause: playbook.triggerCause,
        stepsCount: input.stepTemplates.length,
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return playbook;
  }

  async updatePlaybook(
    id: string,
    input: UpdatePlaybookInput,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.getPlaybookById(id);

    const updated = await prisma.playbook.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.nameKn && { nameKn: input.nameKn }),
        ...(input.stepTemplates && { stepTemplates: input.stepTemplates as any }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await auditService.record({
      action: AuditAction.UPDATE,
      entity: 'Playbook',
      entityId: updated.id,
      actorId: user.id,
      before: {
        name: existing.name,
        isActive: existing.isActive,
        stepTemplates: existing.stepTemplates,
      },
      after: {
        name: updated.name,
        isActive: updated.isActive,
        stepTemplates: updated.stepTemplates,
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return updated;
  }
}

export const playbooksService = new PlaybooksService();
