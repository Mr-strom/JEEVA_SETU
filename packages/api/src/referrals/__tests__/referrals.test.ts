import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CaseStatus } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';
import { caseEventsService } from '../../case-events/case-events.service';

describe('FR-02: Referral Creation, Queue, Case Detail & Timeline (Phase 5B)', () => {
  let app: FastifyInstance;

  const mockUsers: Record<string, AuthUser> = {
    senderPhc: {
      id: 'bbbb2222-2222-2222-2222-222222222222',
      email: 'phc.bilikere@jeevasetu.internal',
      name: 'Dr. Ramesh (MO Bilikere PHC)',
      role: Role.SENDING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222203',
      district: 'Mysuru',
      isActive: true,
    },
    receiverDh: {
      id: 'cccc3333-3333-3333-3333-333333333333',
      email: 'referrals.cheluvamba@jeevasetu.internal',
      name: 'Cheluvamba Referral Desk',
      role: Role.RECEIVING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222201',
      district: 'Mysuru',
      isActive: true,
    },
    unrelatedPhc: {
      id: '99999999-9999-9999-9999-999999999999',
      email: 'other.phc@jeevasetu.internal',
      name: 'Other PHC MO',
      role: Role.SENDING_FACILITY,
      facilityId: '11111111-1111-1111-1111-111111111103', // Anekal CHC
      district: 'Bangalore Urban',
      isActive: true,
    },
  };

  const existingCases: Record<string, any> = {};
  const existingEvents: any[] = [];

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Reset test store
    Object.keys(existingCases).forEach((k) => delete existingCases[k]);
    existingEvents.length = 0;

    // Mock Prisma User lookup
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      const user = Object.values(mockUsers).find((u) => u.id === args.where.id || u.email === args.where.email);
      return user ? ({ ...user, facility: null } as any) : null;
    });

    // Mock PatientReference
    vi.spyOn(prisma.patientReference, 'upsert').mockImplementation(async (args: any) => {
      return {
        id: 'pat-12345678-1234-1234-1234-123456789012',
        externalId: args.create.externalId,
        nameHash: args.create.nameHash,
        age: args.create.age || 26,
        gravida: args.create.gravida || 2,
        parity: args.create.parity || 1,
        riskFlags: args.create.riskFlags || ['SEVERE_ANAEMIA'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    });

    // Mock ReferralCase create
    vi.spyOn(prisma.referralCase, 'create').mockImplementation(async (args: any) => {
      const newCase = {
        id: `rc-${Date.now()}-${Math.random()}`,
        caseId: args.data.caseId,
        patientId: args.data.patientId,
        sendingFacilityId: args.data.sendingFacilityId,
        receivingFacilityId: args.data.receivingFacilityId,
        status: args.data.status,
        riskFlags: args.data.riskFlags,
        transportNeeded: args.data.transportNeeded,
        transportMode: args.data.transportMode,
        clinicalSummary: args.data.clinicalSummary,
        createdById: args.data.createdById,
        acknowledgementDeadline: args.data.acknowledgementDeadline,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: args.data.patientId,
          externalId: 'ORS-KA-2026-999',
          nameHash: 'hashed-patient-name',
        },
        sendingFacility: {
          id: args.data.sendingFacilityId,
          name: 'Bilikere PHC',
          district: 'Mysuru',
        },
        receivingFacility: args.data.receivingFacilityId
          ? {
              id: args.data.receivingFacilityId,
              name: 'Cheluvamba Hospital',
              district: 'Mysuru',
            }
          : null,
        createdBy: {
          id: args.data.createdById,
          name: 'Dr. Ramesh',
          email: 'phc.bilikere@jeevasetu.internal',
          role: Role.SENDING_FACILITY,
        },
      };
      existingCases[newCase.id] = newCase;
      existingCases[newCase.caseId] = newCase;
      return newCase as any;
    });

    // Mock ReferralCase findMany & count
    vi.spyOn(prisma.referralCase, 'findMany').mockImplementation(async (args: any) => {
      let list = Object.values(existingCases).filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);
      if (args.where?.sendingFacilityId) {
        list = list.filter((c) => c.sendingFacilityId === args.where.sendingFacilityId);
      }
      if (args.where?.status) {
        list = list.filter((c) => c.status === args.where.status);
      }
      return list as any;
    });

    vi.spyOn(prisma.referralCase, 'count').mockImplementation(async () => {
      return Object.values(existingCases).filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx).length;
    });

    // Mock ReferralCase findFirst
    vi.spyOn(prisma.referralCase, 'findFirst').mockImplementation(async (args: any) => {
      const match = Object.values(existingCases).find(
        (c) => c.id === args.where?.OR?.[0]?.id || c.caseId === args.where?.OR?.[1]?.caseId,
      );
      if (!match) return null;
      return {
        ...match,
        events: existingEvents.filter((e) => e.caseId === match.id),
      } as any;
    });

    // Mock ReferralCase update
    vi.spyOn(prisma.referralCase, 'update').mockImplementation(async (args: any) => {
      const match = existingCases[args.where.id];
      if (!match) throw new Error('Not found');
      const updated = { ...match, ...args.data, updatedAt: new Date() };
      existingCases[updated.id] = updated;
      existingCases[updated.caseId] = updated;
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

    vi.spyOn(prisma.caseEvent, 'findUnique').mockImplementation(async (args: any) => {
      const event = existingEvents.find((e) => e.idempotencyKey === args.where.idempotencyKey);
      if (!event) return null;
      const associatedCase = existingCases[event.caseId];
      return {
        ...event,
        case: associatedCase,
      } as any;
    });

    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);
  });

  describe('1. Idempotency & Creation Safety', () => {
    it('duplicate submission with the same Idempotency-Key returns the original case, not a new one', async () => {
      const senderToken = authService.generateToken(mockUsers.senderPhc);
      const idempotencyKey = '33333333-3333-4333-a333-333333333333';

      const payload = {
        isDraft: false,
        sendingFacilityId: mockUsers.senderPhc.facilityId,
        receivingFacilityId: mockUsers.receiverDh.facilityId,
        patientExternalId: 'ORS-KA-2026-0001',
        patientAge: 24,
        gravida: 2,
        parity: 1,
        riskFlags: ['SEVERE_ANAEMIA', 'PRE_ECLAMPSIA'],
        transportNeeded: true,
        transportMode: '108_AMBULANCE',
        clinicalSummary: 'High blood pressure, severe pallor',
      };

      // First submission
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload,
      });

      expect(res1.statusCode).toBe(201);
      const case1 = JSON.parse(res1.payload);
      expect(case1.caseId).toMatch(/^JS-\d{4}-[0-9A-F]{6}$/);
      expect(case1.status).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);

      // Duplicate submission with identical idempotency key
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
          'idempotency-key': idempotencyKey,
        },
        payload,
      });

      expect(res2.statusCode).toBe(201);
      const case2 = JSON.parse(res2.payload);
      expect(case2.id).toBe(case1.id);
      expect(case2.caseId).toBe(case1.caseId);

      // Verify no duplicate CaseEvent was created
      const eventsForCase = existingEvents.filter((e) => e.caseId === case1.id);
      expect(eventsForCase.length).toBe(1);
    });
  });

  describe('2. Validation & Error Handling', () => {
    it('rejects an invalid draft or missing fields with field-level errors', async () => {
      const senderToken = authService.generateToken(mockUsers.senderPhc);

      // Submitted referral missing receivingFacilityId
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        payload: {
          isDraft: false,
          sendingFacilityId: mockUsers.senderPhc.facilityId,
          patientExternalId: 'ORS-KA-2026-0002',
          // missing receivingFacilityId on non-draft
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.some((fe: any) => fe.field === 'receivingFacilityId')).toBe(true);
    });
  });

  describe('3. Sender Queue Visibility', () => {
    it('the case appears in the sender queue immediately after creation', async () => {
      const senderToken = authService.generateToken(mockUsers.senderPhc);

      // Create a referral
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        payload: {
          isDraft: false,
          sendingFacilityId: mockUsers.senderPhc.facilityId,
          receivingFacilityId: mockUsers.receiverDh.facilityId,
          patientExternalId: 'ORS-KA-2026-0003',
          riskFlags: ['PRE_ECLAMPSIA'],
          transportNeeded: false,
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createdCase = JSON.parse(createRes.payload);

      // Query sender queue
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
      });

      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.payload);
      expect(listBody.items.some((item: any) => item.id === createdCase.id)).toBe(true);
    });
  });

  describe('4. Operational Field Updates & Append-Only History', () => {
    it('updates operational fields and appends an immutable CaseEvent instead of in-place edit', async () => {
      const senderToken = authService.generateToken(mockUsers.senderPhc);

      // 1. Create referral
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        payload: {
          isDraft: true,
          sendingFacilityId: mockUsers.senderPhc.facilityId,
          patientExternalId: 'ORS-KA-2026-0004',
          riskFlags: ['GESTATIONAL_DIABETES'],
          transportNeeded: false,
        },
      });

      const initialCase = JSON.parse(createRes.payload);

      // 2. Patch operational fields (transport update)
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/referrals/${initialCase.id}`,
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        payload: {
          transportNeeded: true,
          transportMode: '108_AMBULANCE',
          clinicalSummary: 'Patient requires emergency ambulance dispatch',
        },
      });

      expect(patchRes.statusCode).toBe(200);
      const updatedCase = JSON.parse(patchRes.payload);
      expect(updatedCase.transportNeeded).toBe(true);
      expect(updatedCase.transportMode).toBe('108_AMBULANCE');

      // 3. Verify event timeline contains both 'CREATED' and 'UPDATED' events
      const timelineRes = await app.inject({
        method: 'GET',
        url: `/api/v1/referrals/${initialCase.id}/timeline`,
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
      });

      expect(timelineRes.statusCode).toBe(200);
      const timeline = JSON.parse(timelineRes.payload);
      expect(timeline.length).toBe(2);
      expect(timeline[0].type).toBe('CREATED');
      expect(timeline[1].type).toBe('UPDATED');
      expect(timeline[1].payload.transportMode).toBe('108_AMBULANCE');
    });
  });

  describe('5. Scope Protection on Retrieval', () => {
    it('blocks unrelated facility from retrieving case', async () => {
      const senderToken = authService.generateToken(mockUsers.senderPhc);
      const unrelatedToken = authService.generateToken(mockUsers.unrelatedPhc);

      // Create case at Bilikere PHC
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        payload: {
          isDraft: false,
          sendingFacilityId: mockUsers.senderPhc.facilityId,
          receivingFacilityId: mockUsers.receiverDh.facilityId,
          patientExternalId: 'ORS-KA-2026-0005',
          riskFlags: ['SEVERE_ANAEMIA'],
          transportNeeded: false,
        },
      });

      const caseData = JSON.parse(createRes.payload);

      // Attempt to access case by unrelated facility officer
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/referrals/${caseData.id}`,
        headers: {
          authorization: `Bearer ${unrelatedToken}`,
        },
      });

      expect(getRes.statusCode).toBe(403);
      expect(JSON.parse(getRes.payload).code).toBe('FORBIDDEN');
    });
  });
});
