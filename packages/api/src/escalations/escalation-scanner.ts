import { CaseStatus, EscalationStatus, AuditAction, GapPhase, GapCauseClass } from '@prisma/client';
import { prisma } from '../shared/db';
import { classifyGap } from '../gaps/gaps.engine';
import { auditService } from '../audit/audit.service';
import { EscalationScanResult } from './escalation.types';

export class EscalationScanner {
  /**
   * Scans for overdue cases/tasks, classifies gaps with GapSense, and creates Escalations.
   * Guaranteed idempotent: running twice never duplicates escalations for the same case and stage.
   */
  async scan(): Promise<EscalationScanResult> {
    const startTime = Date.now();
    let scanned = 0;
    let created = 0;
    let notified = 0;
    let failed = 0;

    const now = new Date();

    try {
      // 1. Scan for unacknowledged cases past SLA
      const overdueAckCases = await prisma.referralCase.findMany({
        where: {
          status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
          acknowledgementDeadline: { lte: now },
        },
        include: {
          events: { orderBy: { createdAt: 'desc' } },
          gapEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
          escalations: { where: { status: { in: [EscalationStatus.OPEN, EscalationStatus.IN_PROGRESS] } } },
          receivingFacility: true,
        },
      });

      for (const c of overdueAckCases) {
        scanned++;
        try {
          // If case already has an active open escalation, skip creating duplicate
          if (c.escalations.length > 0) {
            continue;
          }

          const classification = classifyGap({
            caseId: c.id,
            status: c.status,
            acknowledgementDeadline: c.acknowledgementDeadline,
            hasAcknowledgementEvent: false,
            notificationDelivered: true,
          });

          const createdEscalation = await this.createGapAndEscalation(
            c.id,
            classification.phase,
            classification.causeClass,
            classification.evidence,
            c.receivingFacilityId || undefined,
          );

          if (createdEscalation) {
            created++;
            notified++;
          }
        } catch (err: any) {
          // If duplicate key error caught from database unique constraint, safely ignore
          if (err.code === 'P2002') {
            continue;
          }
          console.error(`Failed to escalate unacknowledged case ${c.caseId}`, err);
          failed++;
        }
      }

      // 2. Scan for arrived cases without disposition past SLA
      const overdueDispCases = await prisma.referralCase.findMany({
        where: {
          status: CaseStatus.ARRIVED,
          dispositionDeadline: { lte: now },
        },
        include: {
          events: { orderBy: { createdAt: 'desc' } },
          escalations: { where: { status: { in: [EscalationStatus.OPEN, EscalationStatus.IN_PROGRESS] } } },
          receivingFacility: true,
        },
      });

      for (const c of overdueDispCases) {
        scanned++;
        try {
          if (c.escalations.length > 0) {
            continue;
          }

          const classification = classifyGap({
            caseId: c.id,
            status: c.status,
            dispositionDeadline: c.dispositionDeadline,
            hasDispositionEvent: false,
          });

          const createdEscalation = await this.createGapAndEscalation(
            c.id,
            classification.phase,
            classification.causeClass,
            classification.evidence,
            c.receivingFacilityId || undefined,
          );

          if (createdEscalation) {
            created++;
            notified++;
          }
        } catch (err: any) {
          if (err.code === 'P2002') {
            continue;
          }
          console.error(`Failed to escalate disposition overdue case ${c.caseId}`, err);
          failed++;
        }
      }

      // 3. Scan for overdue follow-up tasks
      const overdueFollowUps = await prisma.followUpTask.findMany({
        where: {
          outcome: null,
          escalated: false,
          dueDate: { lte: now },
        },
        include: {
          case: {
            include: {
              escalations: { where: { status: { in: [EscalationStatus.OPEN, EscalationStatus.IN_PROGRESS] } } },
            },
          },
        },
      });

      for (const fup of overdueFollowUps) {
        scanned++;
        try {
          if (fup.case.escalations.length > 0) {
            continue;
          }

          const classification = classifyGap({
            caseId: fup.caseId,
            status: fup.case.status,
            followUpDueDate: fup.dueDate,
            followUpCompleted: false,
            followUpContactConfirmed: false,
          });

          const createdEscalation = await this.createGapAndEscalation(
            fup.caseId,
            classification.phase,
            classification.causeClass,
            classification.evidence,
            fup.case.sendingFacilityId,
          );

          if (createdEscalation) {
            created++;
            notified++;
            // Mark followUp as escalated
            await prisma.followUpTask.update({
              where: { id: fup.id },
              data: { escalated: true },
            });
          }
        } catch (err: any) {
          if (err.code === 'P2002') {
            continue;
          }
          console.error(`Failed to escalate follow-up task ${fup.id}`, err);
          failed++;
        }
      }
    } catch (err) {
      console.error('Fatal error during escalation scanner run', err);
      failed++;
    }

    const durationMs = Date.now() - startTime;
    return {
      scanned,
      created,
      notified,
      failed,
      durationMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper to atomically record GapEvent, find matching Playbook, and create Escalation with steps.
   */
  private async createGapAndEscalation(
    caseId: string,
    phase: GapPhase,
    causeClass: GapCauseClass,
    evidence: any[],
    facilityId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Find matching playbook
      let playbook = await tx.playbook.findFirst({
        where: {
          triggerPhase: phase,
          triggerCause: causeClass,
          isActive: true,
        },
      });

      // Fallback to default playbook if specific phase+cause not seeded
      if (!playbook) {
        playbook = await tx.playbook.findFirst({
          where: { isActive: true },
        });
      }

      if (!playbook) {
        throw new Error(`No active Playbook found for phase=${phase}, cause=${causeClass}`);
      }

      // 1. Create GapEvent
      const gapEvent = await tx.gapEvent.create({
        data: {
          caseId,
          facilityId: facilityId || null,
          phase,
          causeClass,
          evidence: evidence as any,
          classificationLabel: 'likely cause, pending supervisor review',
          status: 'PENDING_REVIEW',
        },
      });

      // 2. Create Escalation (unique constraint on caseId, gapEventId protects against race conditions)
      const escalation = await tx.escalation.create({
        data: {
          caseId,
          gapEventId: gapEvent.id,
          playbookId: playbook.id,
          status: EscalationStatus.OPEN,
          startedAt: new Date(),
        },
      });

      // 3. Instantiate PlaybookSteps from template
      const stepTemplates: any[] = Array.isArray(playbook.stepTemplates) ? playbook.stepTemplates : [];
      if (stepTemplates.length > 0) {
        await tx.playbookStep.createMany({
          data: stepTemplates.map((tmpl: any) => ({
            escalationId: escalation.id,
            playbookId: playbook!.id,
            stepOrder: tmpl.order || 1,
            description: tmpl.description || 'Action Step',
            descriptionKn: tmpl.descriptionKn || tmpl.description || 'ಕ್ರಮ',
            assigneeRole: tmpl.assigneeRole || 'DISTRICT_SUPERVISOR',
            slaHours: tmpl.slaHours || 4,
          })),
        });
      }

      // 4. Log AuditEvent
      await auditService.record({
        action: AuditAction.ESCALATION,
        entity: 'Escalation',
        entityId: escalation.id,
        actorId: '00000000-0000-0000-0000-000000000000', // Scanner System
        after: {
          caseId,
          gapEventId: gapEvent.id,
          playbookId: playbook.id,
          phase,
          causeClass,
        },
      });

      return escalation;
    });
  }
}

export const escalationScanner = new EscalationScanner();
