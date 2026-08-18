import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, GapPhase, GapCauseClass, EscalationStatus, PlaybookStepStatus, AuditAction } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';

describe('Phase 8B: Escalation Playbooks & Supervisor Actions', () => {
  let app: FastifyInstance;

  const mockClinicalAdmin: AuthUser = {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'clinical.admin@jeevasetu.internal',
    name: 'Dr. Anupama (Clinical Lead)',
    role: Role.CLINICAL_ADMINISTRATOR,
    isActive: true,
  };

  const mockSupervisor: AuthUser = {
    id: '11111111-1111-1111-1111-111111111105',
    email: 'supervisor.mysuru@jeevasetu.karnataka.gov.in',
    name: 'Dr. Savitha Rao (DHO Mysuru)',
    role: Role.DISTRICT_SUPERVISOR,
    district: 'Mysuru',
    isActive: true,
  };

  const mockWorker: AuthUser = {
    id: 'aaaa1111-1111-1111-1111-111111111111',
    email: 'asha.radha@jeevasetu.internal',
    name: 'Radha Bai (ASHA)',
    role: Role.FRONTLINE_WORKER,
    district: 'Mysuru',
    isActive: true,
  };

  const mockPlaybook = {
    id: 'pb-test-01',
    name: 'Transport Delay Protocol',
    nameKn: 'ಸಾರಿಗೆ ವಿಳಂಬ ಪ್ರೋಟೋಕಾಲ್',
    triggerPhase: GapPhase.TRANSPORT,
    triggerCause: GapCauseClass.PROCESS,
    stepTemplates: [
      { order: 1, description: 'Track 108 GPS', descriptionKn: '೧೦೮ ಜಿಪಿಎಸ್ ಪರಿಶೀಲಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 1 },
      { order: 2, description: 'Alert receiving emergency desk', descriptionKn: 'ತುರ್ತು ಡೆಸ್ಕ್‌ಗೆ ತಿಳಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 2 },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStep1 = {
    id: 'step-uuid-1',
    escalationId: 'esc-uuid-1',
    playbookId: 'pb-test-01',
    stepOrder: 1,
    description: 'Track 108 GPS',
    descriptionKn: '೧೦೮ ಜಿಪಿಎಸ್ ಪರಿಶೀಲಿಸಿ',
    assigneeRole: Role.DISTRICT_SUPERVISOR,
    slaHours: 1,
    status: PlaybookStepStatus.PENDING,
    completedById: null,
    completedAt: null,
    evidence: null,
  };

  const mockEscalation = {
    id: 'esc-uuid-1',
    caseId: 'case-uuid-1',
    gapEventId: 'gap-uuid-1',
    playbookId: 'pb-test-01',
    status: EscalationStatus.OPEN,
    assigneeId: null,
    currentStepIndex: 0,
    startedAt: new Date(),
    resolvedAt: null,
    acknowledgedAt: null,
    case: {
      id: 'case-uuid-1',
      caseId: 'JS-2026-000999',
      patient: { externalId: 'ORS-999', age: 25 },
      sendingFacility: { name: 'Bilikere PHC', district: 'Mysuru' },
      receivingFacility: { name: 'Cheluvamba Hospital', district: 'Mysuru' },
      events: [],
    },
    gapEvent: {
      id: 'gap-uuid-1',
      phase: GapPhase.TRANSPORT,
      causeClass: GapCauseClass.PROCESS,
    },
    playbook: mockPlaybook,
    steps: [mockStep1],
    assignee: null,
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

    // Mock user lookups
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === mockClinicalAdmin.id || where.email === mockClinicalAdmin.email) return mockClinicalAdmin as any;
      if (where.id === mockSupervisor.id || where.email === mockSupervisor.email) return mockSupervisor as any;
      return mockWorker as any;
    });

    vi.spyOn(prisma.playbook, 'findMany').mockResolvedValue([mockPlaybook] as any);
    vi.spyOn(prisma.playbook, 'findUnique').mockResolvedValue(mockPlaybook as any);
    vi.spyOn(prisma.playbook, 'create').mockResolvedValue(mockPlaybook as any);
    vi.spyOn(prisma.playbook, 'update').mockResolvedValue(mockPlaybook as any);

    vi.spyOn(prisma.escalation, 'findMany').mockResolvedValue([mockEscalation] as any);
    vi.spyOn(prisma.escalation, 'findUnique').mockResolvedValue(mockEscalation as any);
    vi.spyOn(prisma.escalation, 'update').mockImplementation(async ({ data }: any) => {
      return { ...mockEscalation, ...data } as any;
    });
    vi.spyOn(prisma.playbookStep, 'update').mockImplementation(async ({ data }: any) => {
      return { ...mockStep1, ...data, completedBy: mockSupervisor } as any;
    });
    vi.spyOn(prisma.gapEvent, 'update').mockResolvedValue({} as any);
  });

  describe('1. Clinical Administrator Playbook CRUD & Role Scoping', () => {
    it('allows Clinical Administrator to create a new action playbook', async () => {
      const token = authService.generateToken(mockClinicalAdmin);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/playbooks',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'Discharge Follow-up Timeout Playbook',
          nameKn: 'ಡಿಸ್ಚಾರ್ಜ್ ನಂತರದ ಫಾಲೋ-ಅಪ್ ಪ್ರೋಟೋಕಾಲ್',
          triggerPhase: GapPhase.FOLLOW_UP,
          triggerCause: GapCauseClass.PROCESS,
          stepTemplates: [
            { order: 1, description: 'Dispatch PHC ANM for home visit', descriptionKn: 'ಎಎನ್‌ಎಂ ಮನೆ ಭೇಟಿ ಕಳುಹಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 4 },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.playbook.name).toBe(mockPlaybook.name);
    });

    it('rejects frontline workers from creating or editing playbooks with 403 Forbidden', async () => {
      const workerToken = authService.generateToken(mockWorker);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/playbooks',
        headers: { authorization: `Bearer ${workerToken}` },
        payload: {
          name: 'Unauthorized Playbook',
          nameKn: 'ಅನಧಿಕೃತ',
          triggerPhase: GapPhase.CAPACITY,
          triggerCause: GapCauseClass.CAPACITY,
          stepTemplates: [{ order: 1, description: 'Step', descriptionKn: 'ಕ್ರಮ', assigneeRole: Role.FRONTLINE_WORKER, slaHours: 2 }],
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('2. Supervisor Escalation Acknowledge, Step Execution & Resolution', () => {
    it('POST /api/v1/escalations/:id/acknowledge assigns supervisor and moves status to IN_PROGRESS', async () => {
      const token = authService.generateToken(mockSupervisor);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/escalations/esc-uuid-1/acknowledge',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.escalation.status).toBe(EscalationStatus.IN_PROGRESS);
      expect(body.escalation.assigneeId).toBe(mockSupervisor.id);

      // Verify AuditEvent
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ESCALATION,
          entity: 'Escalation',
          entityId: 'esc-uuid-1',
          actorId: mockSupervisor.id,
        }),
      );
    });

    it('POST /api/v1/escalations/:id/playbook-step records human step completion without auto-completing other steps', async () => {
      const token = authService.generateToken(mockSupervisor);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/escalations/esc-uuid-1/playbook-step',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          stepId: 'step-uuid-1',
          notes: 'Spoke with 108 driver Raghu. Ambulance 8km away on Hunsur bypass.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.step.status).toBe(PlaybookStepStatus.COMPLETED);

      // Verify AuditEvent
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PLAYBOOK_STEP,
          entity: 'PlaybookStep',
          entityId: 'step-uuid-1',
          actorId: mockSupervisor.id,
        }),
      );
    });

    it('POST /api/v1/escalations/:id/resolve resolves escalation with supervisor resolution summary', async () => {
      const token = authService.generateToken(mockSupervisor);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/escalations/esc-uuid-1/resolve',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          resolutionSummary: 'Patient arrived safely at Cheluvamba Hospital, admitted to labour room.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.escalation.status).toBe(EscalationStatus.RESOLVED);

      // Verify AuditEvent
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ESCALATION,
          entity: 'Escalation',
          entityId: 'esc-uuid-1',
          actorId: mockSupervisor.id,
        }),
      );
    });
  });
});
