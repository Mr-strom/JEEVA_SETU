import { GapPhase, GapCauseClass, AuditAction } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { auditService } from '../audit/audit.service';
import { NotFoundError } from '../shared/errors';
import { classifyGap } from './gaps.engine';
import { GapClassificationInput } from './gaps.types';

export interface GapOverrideInput {
  overridePhase: GapPhase;
  overrideCauseClass: GapCauseClass;
  overrideReason: string;
}

export class GapsService {
  /**
   * Evaluates and persists a GapEvent record based on deterministic classification
   */
  async classifyAndRecordGap(input: GapClassificationInput, facilityId?: string) {
    const classification = classifyGap(input);

    const gapEvent = await prisma.gapEvent.create({
      data: {
        caseId: input.caseId,
        facilityId: facilityId || null,
        phase: classification.phase,
        causeClass: classification.causeClass,
        evidence: classification.evidence as any,
        classificationLabel: classification.classificationLabel,
        status: 'PENDING_REVIEW',
      },
    });

    // Log audit event
    await auditService.record({
      action: AuditAction.GAP_CLASSIFIED,
      entity: 'GapEvent',
      entityId: gapEvent.id,
      actorId: '00000000-0000-0000-0000-000000000000', // System / GapSense Engine
      after: {
        caseId: input.caseId,
        phase: classification.phase,
        causeClass: classification.causeClass,
        confidenceScore: classification.confidenceScore,
      },
    });

    return {
      gapEvent,
      classification,
    };
  }

  /**
   * Supervisor Override: updates GapEvent and writes an AuditEvent.
   * NEVER mutates underlying CaseEvents.
   */
  async overrideGap(
    gapId: string,
    input: GapOverrideInput,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existingGap = await prisma.gapEvent.findUnique({
      where: { id: gapId },
      include: { case: true },
    });

    if (!existingGap) {
      throw new NotFoundError('GapEvent', gapId);
    }

    const previousPhase = existingGap.phase;
    const previousCauseClass = existingGap.causeClass;

    const updatedGap = await prisma.gapEvent.update({
      where: { id: gapId },
      data: {
        phase: input.overridePhase,
        causeClass: input.overrideCauseClass,
        overrideUserId: user.id,
        overrideReason: input.overrideReason,
        overriddenAt: new Date(),
        status: 'OVERRIDDEN',
      },
    });

    // Write immutable security-relevant AuditEvent
    await auditService.record({
      action: AuditAction.GAP_OVERRIDE,
      entity: 'GapEvent',
      entityId: updatedGap.id,
      actorId: user.id,
      before: {
        phase: previousPhase,
        causeClass: previousCauseClass,
      },
      after: {
        caseId: existingGap.caseId,
        overriddenPhase: input.overridePhase,
        overriddenCauseClass: input.overrideCauseClass,
        overrideReason: input.overrideReason,
        overriddenAt: updatedGap.overriddenAt,
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return updatedGap;
  }

  /**
   * Find gaps by caseId
   */
  async getGapsForCase(caseId: string) {
    return prisma.gapEvent.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        facility: true,
      },
    });
  }
}

export const gapsService = new GapsService();
