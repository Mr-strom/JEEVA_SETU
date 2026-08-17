import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CaseStatus, DispositionCategory, FollowUpType, FollowUpOutcome, AuditAction } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';
import { caseEventsService } from '../../case-events/case-events.service';

describe('Phase 5D: Dispositions, Follow-ups, Dashboard Reporting & Read-Only Audit', () => {
  let app: FastifyInstance;

  const mockUsers: Record<string, AuthUser> = {
    clinician: {
      id: 'dddd4444-4444-4444-4444-444444444444',
      email: 'dr.savitha.obgyn@jeevasetu.internal',
      name: 'Dr. Savitha (OB/GYN)',
      role: Role.CLINICIAN,
      facilityId: '22222222-2222-2222-2222-222222222201',
      district: 'Mysuru',
      isActive: true,
    },
    receivingDesk: {
      id: 'cccc3333-3333-3333-3333-333333333333',
      email: 'referrals.cheluvamba@jeevasetu.internal',
      name: 'Receiving Desk Officer',
      role: Role.RECEIVING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222201',
      district: 'Mysuru',
      isActive: true,
    },
    frontlineWorker: {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      email: 'asha.radha@jeevasetu.internal',
      name: 'Radha Bai (ASHA)',
      role: Role.FRONTLINE_WORKER,
      facilityId: '22222222-2222-2222-2222-222222222203',
      district: 'Mysuru',
      isActive: true,
    },
    supervisor: {
      id: 'eeee5555-5555-5555-5555-555555555555',
      email: 'supervisor.mysuru@jeevasetu.internal',
      name: 'Kavitha H (Supervisor)',
      role: Role.DISTRICT_SUPERVISOR,
      facilityId: null,
      district: 'Mysuru',
      isActive: true,
    },
  };

  const existingCases: Record<string, any> = {};
  const existingEvents: any[] = [];
  const existingDispositions: any[] = [];
  const existingFollowUps: any[] = [];
  const existingAuditEvents: any[] = [];

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Reset test stores
    Object.keys(existingCases).forEach((k) => delete existingCases[k]);
    existingEvents.length = 0;
    existingDispositions.length = 0;
    existingFollowUps.length = 0;
    existingAuditEvents.length = 0;

    // Seed arrived referral
    const arrivedCase = {
      id: 'case-arrived-101',
      caseId: 'JS-2026-ARR101',
      patientId: 'pat-101',
      sendingFacilityId: '22222222-2222-2222-2222-222222222203',
      receivingFacilityId: mockUsers.clinician.facilityId,
      status: CaseStatus.ARRIVED,
      riskFlags: ['PRE_ECLAMPSIA'],
      transportNeeded: true,
      transportMode: '108_AMBULANCE',
      clinicalSummary: 'BP 160/100, proteinuria',
      createdById: mockUsers.frontlineWorker.id,
      assignedToId: mockUsers.frontlineWorker.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: { id: 'pat-101', externalId: 'ORS-101' },
      sendingFacility: { id: '22222222-2222-2222-2222-222222222203', name: 'Bilikere PHC', district: 'Mysuru' },
      receivingFacility: { id: mockUsers.clinician.facilityId, name: 'Cheluvamba Hospital', district: 'Mysuru' },
      createdBy: { id: mockUsers.frontlineWorker.id, name: 'Radha Bai', role: Role.FRONTLINE_WORKER },
      assignedTo: { id: mockUsers.frontlineWorker.id, name: 'Radha Bai', role: Role.FRONTLINE_WORKER },
      dispositions: [],
      followUpTasks: [],
    };
    existingCases[arrivedCase.id] = arrivedCase;
    existingCases[arrivedCase.caseId] = arrivedCase;

    // Mock Prisma User lookup
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      const user = Object.values(mockUsers).find((u) => u.id === args.where.id || u.email === args.where.email);
      return user ? ({ ...user, facility: null } as any) : null;
    });

    // Mock ReferralCase findFirst & update
    vi.spyOn(prisma.referralCase, 'findFirst').mockImplementation(async (args: any) => {
      const match = Object.values(existingCases).find(
        (c) => c.id === args.where?.OR?.[0]?.id || c.caseId === args.where?.OR?.[1]?.caseId,
      );
      if (!match) return null;
      return {
        ...match,
        followUpTasks: existingFollowUps.filter((f) => f.caseId === match.id),
      } as any;
    });

    vi.spyOn(prisma.referralCase, 'update').mockImplementation(async (args: any) => {
      const match = existingCases[args.where.id];
      if (!match) throw new Error('Not found');
      const updated = {
        ...match,
        ...args.data,
        updatedAt: new Date(),
      };
      existingCases[updated.id] = updated;
      existingCases[updated.caseId] = updated;
      return {
        ...updated,
        followUpTasks: existingFollowUps.filter((f) => f.caseId === updated.id),
      } as any;
    });

    // Mock Disposition upsert
    vi.spyOn(prisma.disposition, 'upsert').mockImplementation(async (args: any) => {
      const disp = {
        id: `disp-${Date.now()}`,
        ...args.create,
        recordedAt: new Date(),
      };
      existingDispositions.push(disp);
      return disp as any;
    });

    // Mock FollowUpTask create, findMany, findUnique, update
    vi.spyOn(prisma.followUpTask, 'create').mockImplementation(async (args: any) => {
      const task = {
        id: `task-${Date.now()}-${existingFollowUps.length}`,
        ...args.data,
        outcome: null,
        completedAt: null,
        escalated: false,
        escalatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingFollowUps.push(task);
      return task as any;
    });

    vi.spyOn(prisma.followUpTask, 'findMany').mockImplementation(async (args: any) => {
      let list = [...existingFollowUps];
      if (args.where?.ownerId) {
        list = list.filter((t) => t.ownerId === args.where.ownerId);
      }
      return list.map((t) => ({
        ...t,
        owner: mockUsers.frontlineWorker,
        case: existingCases[t.caseId],
      })) as any;
    });

    vi.spyOn(prisma.followUpTask, 'count').mockImplementation(async () => existingFollowUps.length);

    vi.spyOn(prisma.followUpTask, 'findUnique').mockImplementation(async (args: any) => {
      const match = existingFollowUps.find((t) => t.id === args.where.id);
      if (!match) return null;
      return {
        ...match,
        case: existingCases[match.caseId],
      } as any;
    });

    vi.spyOn(prisma.followUpTask, 'update').mockImplementation(async (args: any) => {
      const match = existingFollowUps.find((t) => t.id === args.where.id);
      if (!match) throw new Error('Not found');
      const updated = { ...match, ...args.data, updatedAt: new Date() };
      const idx = existingFollowUps.findIndex((t) => t.id === match.id);
      existingFollowUps[idx] = updated;
      return updated as any;
    });

    // Mock CaseEvent create & findMany
    vi.spyOn(prisma.caseEvent, 'create').mockImplementation(async (args: any) => {
      const event = {
        id: `ev-${Date.now()}-${existingEvents.length}`,
        ...args.data,
        createdAt: new Date(),
      };
      existingEvents.push(event);
      return event as any;
    });

    vi.spyOn(prisma.caseEvent, 'findMany').mockImplementation(async (args: any) => {
      return existingEvents.filter((e) => e.caseId === args.where.caseId);
    });

    // Mock AuditEvent create & findMany
    vi.spyOn(prisma.auditEvent, 'create').mockImplementation(async (args: any) => {
      const audit = {
        id: `audit-${Date.now()}-${existingAuditEvents.length}`,
        ...args.data,
        createdAt: new Date(),
      };
      existingAuditEvents.push(audit);
      return audit as any;
    });

    vi.spyOn(prisma.auditEvent, 'findMany').mockImplementation(async (args: any) => {
      return existingAuditEvents.map((a) => ({
        ...a,
        actor: { id: a.actorId, name: 'Test Actor', email: 'test@internal', role: Role.CLINICIAN },
      })) as any;
    });

    vi.spyOn(prisma.auditEvent, 'count').mockImplementation(async () => existingAuditEvents.length);
  });

  describe('1. Clinician-Only Disposition Recording', () => {
    it('allows clinician role to record clinical disposition with approved category', async () => {
      const clinicianToken = authService.generateToken(mockUsers.clinician);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-arrived-101/disposition',
        headers: {
          authorization: `Bearer ${clinicianToken}`,
        },
        payload: {
          category: DispositionCategory.ADMITTED,
          detail: 'Admitted to Maternity High-Risk HDU Bed 4',
        },
      });

      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(res.payload);
      expect(updated.status).toBe(CaseStatus.CLINICAL_DISPOSITION_RECORDED);

      // Verify immutable CaseEvent and Disposition created
      expect(existingDispositions.length).toBe(1);
      expect(existingDispositions[0].category).toBe(DispositionCategory.ADMITTED);
      expect(existingEvents.some((e) => e.type === 'CLINICAL_DISPOSITION_RECORDED')).toBe(true);
    });

    it('rejects disposition recording by non-clinician roles with 403 Forbidden', async () => {
      const workerToken = authService.generateToken(mockUsers.frontlineWorker);
      const receivingDeskToken = authService.generateToken(mockUsers.receivingDesk);

      // Frontline worker attempt
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-arrived-101/disposition',
        headers: {
          authorization: `Bearer ${workerToken}`,
        },
        payload: {
          category: DispositionCategory.ADMITTED,
        },
      });
      expect(res1.statusCode).toBe(403);
      expect(JSON.parse(res1.payload).code).toBe('FORBIDDEN');

      // Receiving desk officer attempt
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-arrived-101/disposition',
        headers: {
          authorization: `Bearer ${receivingDeskToken}`,
        },
        payload: {
          category: DispositionCategory.ADMITTED,
        },
      });
      expect(res2.statusCode).toBe(403);
      expect(JSON.parse(res2.payload).code).toBe('FORBIDDEN');
    });
  });

  describe('2. Patient Discharge & Follow-up Task Creation', () => {
    it('discharges patient and schedules follow-up task with due date and owner', async () => {
      // First record disposition
      existingCases['case-arrived-101'].status = CaseStatus.CLINICAL_DISPOSITION_RECORDED;
      const clinicianToken = authService.generateToken(mockUsers.clinician);

      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-arrived-101/discharge',
        headers: {
          authorization: `Bearer ${clinicianToken}`,
        },
        payload: {
          followUpDueDate: dueDate,
          type: FollowUpType.HOME_VISIT,
          dischargeSummary: 'Mother and neonate stable. Monitor BP on post-natal day 3.',
        },
      });

      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(res.payload);
      expect(updated.status).toBe(CaseStatus.FOLLOW_UP_DUE);

      // Verify FollowUpTask was scheduled
      expect(existingFollowUps.length).toBe(1);
      expect(existingFollowUps[0].ownerId).toBe(mockUsers.frontlineWorker.id);
      expect(existingFollowUps[0].type).toBe(FollowUpType.HOME_VISIT);
    });
  });

  describe('3. Follow-up Lifecycle (Complete & Escalate)', () => {
    it('frontline worker can view and complete follow-up task', async () => {
      // Seed follow-up task
      const task = {
        id: 'task-test-01',
        caseId: 'case-arrived-101',
        ownerId: mockUsers.frontlineWorker.id,
        type: FollowUpType.HOME_VISIT,
        dueDate: new Date(),
        outcome: null,
        completedAt: null,
        escalated: false,
        escalatedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingFollowUps.push(task);
      existingCases['case-arrived-101'].status = CaseStatus.FOLLOW_UP_DUE;

      const workerToken = authService.generateToken(mockUsers.frontlineWorker);

      // 1. List follow-ups
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/follow-ups',
        headers: {
          authorization: `Bearer ${workerToken}`,
        },
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.payload);
      expect(listBody.items.length).toBeGreaterThan(0);

      // 2. Complete follow-up
      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/follow-ups/${task.id}/complete`,
        headers: {
          authorization: `Bearer ${workerToken}`,
        },
        payload: {
          outcome: FollowUpOutcome.COMPLETED,
          notes: 'Home visit conducted. Maternal BP 120/80, infant feeding well.',
        },
      });

      expect(completeRes.statusCode).toBe(200);
      const completedTask = JSON.parse(completeRes.payload);
      expect(completedTask.outcome).toBe(FollowUpOutcome.COMPLETED);
      expect(existingCases['case-arrived-101'].status).toBe(CaseStatus.FOLLOW_UP_COMPLETED);
    });

    it('allows escalating an overdue follow-up task', async () => {
      const task = {
        id: 'task-test-02',
        caseId: 'case-arrived-101',
        ownerId: mockUsers.frontlineWorker.id,
        type: FollowUpType.HOME_VISIT,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        outcome: null,
        completedAt: null,
        escalated: false,
        escalatedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingFollowUps.push(task);
      existingCases['case-arrived-101'].status = CaseStatus.FOLLOW_UP_DUE;

      const workerToken = authService.generateToken(mockUsers.frontlineWorker);

      const escalateRes = await app.inject({
        method: 'POST',
        url: `/api/v1/follow-ups/${task.id}/escalate`,
        headers: {
          authorization: `Bearer ${workerToken}`,
        },
        payload: {
          reason: 'Patient relocated to parental home, uncontactable after 3 attempts',
        },
      });

      expect(escalateRes.statusCode).toBe(200);
      const escalatedTask = JSON.parse(escalateRes.payload);
      expect(escalatedTask.escalated).toBe(true);
      expect(existingCases['case-arrived-101'].status).toBe(CaseStatus.FOLLOW_UP_ESCALATED);
    });
  });

  describe('4. Referral Closure Guardrail', () => {
    it('rejects closing a case when a mandatory follow-up task is unresolved', async () => {
      const supervisorToken = authService.generateToken(mockUsers.supervisor);

      // Seed unresolved follow-up task
      const task = {
        id: 'task-unresolved-03',
        caseId: 'case-arrived-101',
        ownerId: mockUsers.frontlineWorker.id,
        type: FollowUpType.HOME_VISIT,
        dueDate: new Date(),
        outcome: null,
        completedAt: null,
        escalated: false,
        escalatedAt: null,
      };
      existingFollowUps.push(task);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-arrived-101/close',
        headers: {
          authorization: `Bearer ${supervisorToken}`,
        },
        payload: {
          closureReason: 'Attempted premature closure',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toContain('unresolved mandatory follow-up');
    });

    it('successfully closes the referral once follow-up is resolved', async () => {
      const supervisorToken = authService.generateToken(mockUsers.supervisor);

      // Seed resolved follow-up task
      const task = {
        id: 'task-resolved-04',
        caseId: 'case-arrived-101',
        ownerId: mockUsers.frontlineWorker.id,
        type: FollowUpType.HOME_VISIT,
        dueDate: new Date(),
        outcome: FollowUpOutcome.COMPLETED,
        completedAt: new Date(),
        escalated: false,
        escalatedAt: null,
      };
      existingFollowUps.push(task);
      existingCases['case-arrived-101'].status = CaseStatus.FOLLOW_UP_COMPLETED;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-arrived-101/close',
        headers: {
          authorization: `Bearer ${supervisorToken}`,
        },
        payload: {
          closureReason: 'Normal postnatal recovery confirmed, care loop closed',
        },
      });

      expect(res.statusCode).toBe(200);
      const closedCase = JSON.parse(res.payload);
      expect(closedCase.status).toBe(CaseStatus.CLOSED);
      expect(closedCase.closedAt).toBeDefined();
    });
  });

  describe('5. Dashboard Summary Reporting (FR-11)', () => {
    it('returns role-specific dashboard summary counts', async () => {
      const supervisorToken = authService.generateToken(mockUsers.supervisor);

      vi.spyOn(prisma.referralCase, 'count').mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // open
        .mockResolvedValueOnce(1) // overdue ack
        .mockResolvedValueOnce(1) // overdue follow-up
        .mockResolvedValueOnce(2) // escalated
        .mockResolvedValueOnce(1) // rerouted
        .mockResolvedValueOnce(3); // closed

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reporting/summary',
        headers: {
          authorization: `Bearer ${supervisorToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const summary = JSON.parse(res.payload);
      expect(summary.role).toBe(Role.DISTRICT_SUPERVISOR);
      expect(summary.openCases).toBe(5);
      expect(summary.overdueCount).toBe(2);
      expect(summary.escalatedCount).toBe(2);
      expect(summary.totalCases).toBe(10);
    });
  });

  describe('6. Read-Only Audit Trail (FR-12)', () => {
    it('allows querying case audit history via GET', async () => {
      const clinicianToken = authService.generateToken(mockUsers.clinician);

      existingAuditEvents.push({
        id: 'audit-1',
        actorId: mockUsers.clinician.id,
        action: AuditAction.CREATE,
        entity: 'ReferralCase',
        entityId: 'case-arrived-101',
        before: null,
        after: { status: CaseStatus.ARRIVED },
        createdAt: new Date(),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/audit/cases/case-arrived-101',
        headers: {
          authorization: `Bearer ${clinicianToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const events = JSON.parse(res.payload);
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);
    });

    it('ensures no mutating HTTP methods (PATCH, DELETE, PUT) exist on audit routes', async () => {
      const adminToken = authService.generateToken({
        id: 'admin-id',
        email: 'admin@internal',
        name: 'Admin',
        role: Role.ADMINISTRATOR,
        facilityId: null,
        isActive: true,
      });

      // PATCH attempt on audit
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/audit/cases/case-arrived-101',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { action: 'MUTATED' },
      });
      expect(patchRes.statusCode).toBe(404);

      // DELETE attempt on audit
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/audit/cases/case-arrived-101',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(deleteRes.statusCode).toBe(404);
    });
  });
});
