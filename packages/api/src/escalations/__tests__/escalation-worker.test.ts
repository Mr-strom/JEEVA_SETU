import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CaseStatus, EscalationStatus, GapPhase, GapCauseClass } from '@prisma/client';
import { escalationScanner } from '../escalation-scanner';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';

describe('Phase 8A: Escalation Scanner Worker & Deduplication', () => {
  const existingEscalations: Record<string, any> = {};
  const existingGapEvents: Record<string, any> = {};

  const mockPlaybook = {
    id: 'pb-ack-process',
    name: 'Acknowledgement Process Failure Playbook',
    nameKn: 'ಸ್ವೀಕೃತಿ ಪ್ರಕ್ರಿಯೆ ವಿಫಲತೆ ಪ್ಲೇಬುಕ್',
    triggerPhase: GapPhase.ACKNOWLEDGEMENT,
    triggerCause: GapCauseClass.PROCESS,
    stepTemplates: [
      { order: 1, description: 'Call receiving hospital desk', assigneeRole: 'DISTRICT_SUPERVISOR', slaHours: 2 },
    ],
    isActive: true,
  };

  const overdueCase = {
    id: 'case-overdue-101',
    caseId: 'JS-2026-000101',
    status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
    acknowledgementDeadline: new Date(Date.now() - 30 * 60 * 1000), // expired 30 mins ago
    events: [],
    gapEvents: [],
    escalations: [],
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
  };

  beforeEach(() => {
    Object.keys(existingEscalations).forEach((k) => delete existingEscalations[k]);
    Object.keys(existingGapEvents).forEach((k) => delete existingGapEvents[k]);

    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

    // Mock Playbook lookup
    vi.spyOn(prisma.playbook, 'findFirst').mockResolvedValue(mockPlaybook as any);

    // Mock prisma.$transaction to simulate atomic execution with unique constraint
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const txMock = {
        playbook: {
          findFirst: vi.fn().mockResolvedValue(mockPlaybook),
        },
        gapEvent: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const id = `gap-${Date.now()}-${Math.random()}`;
            const gap = { id, ...data };
            existingGapEvents[id] = gap;
            return gap;
          }),
        },
        escalation: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const key = `${data.caseId}_${data.gapEventId}`;
            // If already created, throw P2002 unique constraint error
            if (existingEscalations[key]) {
              const err: any = new Error('Unique constraint failed on the fields: (`caseId`,`gapEventId`)');
              err.code = 'P2002';
              throw err;
            }
            const esc = { id: `esc-${Date.now()}`, ...data };
            existingEscalations[key] = esc;
            return esc;
          }),
        },
        playbookStep: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(txMock);
    });
  });

  it('scans overdue case and creates exactly one Escalation with GapEvent and steps on first run', async () => {
    vi.spyOn(prisma.referralCase, 'findMany').mockImplementation(async (args: any) => {
      if (args?.where?.status === CaseStatus.ACKNOWLEDGEMENT_PENDING) {
        return [overdueCase] as any;
      }
      return [];
    });
    vi.spyOn(prisma.followUpTask, 'findMany').mockResolvedValue([]);

    const result = await escalationScanner.scan();

    expect(result.scanned).toBe(1);
    expect(result.created).toBe(1);
    expect(result.notified).toBe(1);
    expect(result.failed).toBe(0);
    expect(Object.keys(existingEscalations).length).toBe(1);
  });

  it('running the worker twice in immediate succession on the same overdue case NEVER produces two Escalations', async () => {
    let hasRun = false;
    vi.spyOn(prisma.referralCase, 'findMany').mockImplementation(async (args: any) => {
      if (args?.where?.status === CaseStatus.ACKNOWLEDGEMENT_PENDING) {
        if (!hasRun) {
          return [{ ...overdueCase, escalations: [] }] as any;
        } else {
          const createdEscalation = Object.values(existingEscalations)[0];
          return [{ ...overdueCase, escalations: [createdEscalation] }] as any;
        }
      }
      return [];
    });
    vi.spyOn(prisma.followUpTask, 'findMany').mockResolvedValue([]);

    // 1. First run: creates escalation
    const firstRun = await escalationScanner.scan();
    expect(firstRun.created).toBe(1);
    expect(firstRun.failed).toBe(0);
    hasRun = true;

    // 2. Second run: case now has active escalation attached
    const secondRun = await escalationScanner.scan();

    expect(secondRun.scanned).toBe(1);
    expect(secondRun.created).toBe(0); // Deduplicated, zero duplicate escalations created
    expect(secondRun.failed).toBe(0);
    expect(Object.keys(existingEscalations).length).toBe(1); // Still exactly one escalation in database
  });
});
