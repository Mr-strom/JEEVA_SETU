import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CaseStatus, FollowUpOutcome } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { caseEventsService } from '../../case-events/case-events.service';
import { referralsService } from '../../referrals/referrals.service';
import { followUpsService } from '../../follow-ups/follow-ups.service';

describe('Phase 7: Offline Sync Layer End to End', () => {
  let app: FastifyInstance;

  const mockWorker: AuthUser = {
    id: 'aaaa1111-1111-1111-1111-111111111111',
    email: 'asha.radha@jeevasetu.internal',
    name: 'Radha Bai (ASHA)',
    role: Role.FRONTLINE_WORKER,
    facilityId: '22222222-2222-2222-2222-222222222203',
    district: 'Mysuru',
    isActive: true,
  };

  const existingEvents: any[] = [];
  const existingCases: Record<string, any> = {};
  const existingFollowUps: Record<string, any> = {};

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Reset stores
    existingEvents.length = 0;
    Object.keys(existingCases).forEach((k) => delete existingCases[k]);
    Object.keys(existingFollowUps).forEach((k) => delete existingFollowUps[k]);

    // Mock User lookup
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockWorker as any);

    // Mock caseEventsService.findByIdempotencyKey
    vi.spyOn(caseEventsService, 'findByIdempotencyKey').mockImplementation(async (key: string) => {
      const match = existingEvents.find((e) => e.idempotencyKey === key);
      return match || null;
    });

    // Mock referralsService.createReferral
    vi.spyOn(referralsService, 'createReferral').mockImplementation(async (input: any, user: any, idemKey?: any) => {
      const id = `rc-sync-${Date.now()}`;
      const newCase = {
        id,
        caseId: `JS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
        patientExternalId: input.patientExternalId,
        sendingFacilityId: input.sendingFacilityId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      existingCases[id] = newCase;
      if (idemKey) {
        existingEvents.push({
          id: `ev-${Date.now()}`,
          caseId: id,
          idempotencyKey: idemKey,
          payload: newCase,
        });
      }
      return newCase as any;
    });

    // Mock followUpsService.completeFollowUp
    vi.spyOn(followUpsService, 'completeFollowUp').mockImplementation(async (taskId: string, input: any, user: any, idemKey?: any) => {
      const task = existingFollowUps[taskId];
      task.outcome = input.outcome;
      task.completedAt = new Date();
      task.notes = input.notes;
      task.updatedAt = new Date();
      if (idemKey) {
        existingEvents.push({
          id: `ev-fup-${Date.now()}`,
          caseId: task.caseId,
          idempotencyKey: idemKey,
          payload: task,
        });
      }
      return task as any;
    });

    // Mock prisma findUnique / findMany for sync changes
    vi.spyOn(prisma.referralCase, 'findMany').mockResolvedValue(Object.values(existingCases) as any);
    vi.spyOn(prisma.followUpTask, 'findMany').mockResolvedValue(Object.values(existingFollowUps) as any);
  });

  describe('1. Offline Create then Batch Sync', () => {
    it('successfully processes and applies an offline referral creation mutation', async () => {
      const workerToken = authService.generateToken(mockWorker);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/batch',
        headers: {
          authorization: `Bearer ${workerToken}`,
        },
        payload: {
          mutations: [
            {
              mutationId: 'mut-001',
              operationType: 'CREATE_REFERRAL',
              localCaseId: 'loc-client-991',
              payload: {
                patientExternalId: 'ORS-SYNC-001',
                riskFlags: ['SEVERE_ANAEMIA'],
                transportNeeded: true,
              },
              clientTimestamp: new Date().toISOString(),
              idempotencyKey: 'idem-sync-001',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.applied.length).toBe(1);
      expect(body.applied[0].status).toBe('applied');
      expect(body.applied[0].localCaseId).toBe('loc-client-991');
      expect(body.applied[0].serverCaseId).toBeDefined();
      expect(body.serverCursor).toBeDefined();
    });
  });

  describe('2. Idempotency Replay & Duplicate Request Handling', () => {
    it('retry with the same Idempotency-Key returns already_applied without creating duplicate cases', async () => {
      const workerToken = authService.generateToken(mockWorker);
      const idempotencyKey = 'idem-sync-replay-002';

      // 1. First sync submission
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/batch',
        headers: { authorization: `Bearer ${workerToken}` },
        payload: {
          mutations: [
            {
              mutationId: 'mut-002',
              operationType: 'CREATE_REFERRAL',
              localCaseId: 'loc-002',
              payload: { patientExternalId: 'ORS-SYNC-002', riskFlags: ['PRE_ECLAMPSIA'] },
              clientTimestamp: new Date().toISOString(),
              idempotencyKey,
            },
          ],
        },
      });
      expect(res1.statusCode).toBe(200);
      expect(JSON.parse(res1.payload).applied.length).toBe(1);

      // 2. Duplicate sync replay with identical idempotencyKey
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/batch',
        headers: { authorization: `Bearer ${workerToken}` },
        payload: {
          mutations: [
            {
              mutationId: 'mut-002-retry',
              operationType: 'CREATE_REFERRAL',
              localCaseId: 'loc-002',
              payload: { patientExternalId: 'ORS-SYNC-002', riskFlags: ['PRE_ECLAMPSIA'] },
              clientTimestamp: new Date().toISOString(),
              idempotencyKey,
            },
          ],
        },
      });

      expect(res2.statusCode).toBe(200);
      const body2 = JSON.parse(res2.payload);
      expect(body2.applied.length).toBe(0);
      expect(body2.alreadyApplied.length).toBe(1);
      expect(body2.alreadyApplied[0].status).toBe('already_applied');
    });
  });

  describe('3. Conflicting Concurrent Status Transition (Non-Silent Conflict)', () => {
    it('detects concurrent completion and returns a conflict object with server state rather than silently overwriting', async () => {
      const workerToken = authService.generateToken(mockWorker);

      // Seed already resolved follow-up task on the server
      const taskId = 'task-conflict-100';
      const existingTask = {
        id: taskId,
        caseId: 'case-100',
        outcome: FollowUpOutcome.COMPLETED,
        completedAt: new Date(Date.now() - 3600 * 1000),
        escalated: false,
        notes: 'Already checked by ANM Sunita',
      };
      existingFollowUps[taskId] = existingTask;

      vi.spyOn(prisma.followUpTask, 'findUnique').mockResolvedValue(existingTask as any);

      // Offline worker attempts to complete the same task
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/batch',
        headers: { authorization: `Bearer ${workerToken}` },
        payload: {
          mutations: [
            {
              mutationId: 'mut-conflict-01',
              operationType: 'COMPLETE_FOLLOW_UP',
              payload: {
                taskId,
                outcome: FollowUpOutcome.COMPLETED,
                notes: 'Worker Radha tried to complete again',
              },
              clientTimestamp: new Date().toISOString(),
              idempotencyKey: 'idem-conflict-01',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.applied.length).toBe(0);
      expect(body.conflicts.length).toBe(1);
      expect(body.conflicts[0].status).toBe('conflict');
      expect(body.conflicts[0].conflict).toBeDefined();
      expect(body.conflicts[0].conflict.reason).toContain('already resolved');
      expect(body.conflicts[0].conflict.nextAvailableAction).toBe('REVIEW_RESOLVED_TASK');
    });
  });

  describe('4. Delta Changes Feed & Ack Protocol', () => {
    it('returns changes feed with nextCursor and acks cursor', async () => {
      const workerToken = authService.generateToken(mockWorker);

      const changesRes = await app.inject({
        method: 'GET',
        url: '/api/v1/sync/changes',
        headers: { authorization: `Bearer ${workerToken}` },
      });

      expect(changesRes.statusCode).toBe(200);
      const changesBody = JSON.parse(changesRes.payload);
      expect(changesBody.changes).toBeDefined();
      expect(changesBody.nextCursor).toBeDefined();

      const ackRes = await app.inject({
        method: 'POST',
        url: '/api/v1/sync/ack',
        headers: { authorization: `Bearer ${workerToken}` },
        payload: {
          cursor: changesBody.nextCursor,
        },
      });

      expect(ackRes.statusCode).toBe(200);
      const ackBody = JSON.parse(ackRes.payload);
      expect(ackBody.acknowledgedCursor).toBe(changesBody.nextCursor);
    });
  });
});
