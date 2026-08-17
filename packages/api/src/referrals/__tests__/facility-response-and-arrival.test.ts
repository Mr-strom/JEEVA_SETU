import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CaseStatus, CapacityReasonCode } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';
import { capacitiesService } from '../../capacities/capacities.service';

describe('FR-03 & FR-04: Facility Response, Transport & Arrival (Phase 5C)', () => {
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
    alternateDh: {
      id: 'dddd4444-4444-4444-4444-444444444444',
      email: 'kr.hospital@jeevasetu.internal',
      name: 'KR Hospital Desk',
      role: Role.RECEIVING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222202',
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
  const existingSignals: any[] = [];

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Reset stores
    Object.keys(existingCases).forEach((k) => delete existingCases[k]);
    existingEvents.length = 0;
    existingSignals.length = 0;

    // Seed active submitted case
    const submittedCase = {
      id: 'case-sub-001',
      caseId: 'JS-2026-SUB001',
      patientId: 'pat-001',
      sendingFacilityId: mockUsers.senderPhc.facilityId!,
      receivingFacilityId: mockUsers.receiverDh.facilityId!,
      status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
      riskFlags: ['SEVERE_ANAEMIA'],
      transportNeeded: true,
      transportMode: '108_AMBULANCE',
      clinicalSummary: 'Severe pallor, Hb 6.2',
      createdById: mockUsers.senderPhc.id,
      createdAt: new Date(Date.now() - 90 * 60 * 1000), // Created 90 mins ago
      updatedAt: new Date(Date.now() - 90 * 60 * 1000),
      patient: { id: 'pat-001', externalId: 'ORS-001' },
      sendingFacility: { id: mockUsers.senderPhc.facilityId, name: 'Bilikere PHC', district: 'Mysuru' },
      receivingFacility: { id: mockUsers.receiverDh.facilityId, name: 'Cheluvamba Hospital', district: 'Mysuru' },
      createdBy: { id: mockUsers.senderPhc.id, name: 'Dr. Ramesh', email: mockUsers.senderPhc.email, role: Role.SENDING_FACILITY },
      assignedTo: null,
      events: [],
    };
    existingCases[submittedCase.id] = submittedCase;
    existingCases[submittedCase.caseId] = submittedCase;

    // Seed draft case
    const draftCase = {
      id: 'case-draft-002',
      caseId: 'JS-2026-DFT002',
      patientId: 'pat-002',
      sendingFacilityId: mockUsers.senderPhc.facilityId!,
      receivingFacilityId: null,
      status: CaseStatus.DRAFT,
      riskFlags: ['TWIN_PREGNANCY'],
      transportNeeded: false,
      transportMode: null,
      clinicalSummary: 'Draft antenatal note',
      createdById: mockUsers.senderPhc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: { id: 'pat-002', externalId: 'ORS-002' },
      sendingFacility: { id: mockUsers.senderPhc.facilityId, name: 'Bilikere PHC', district: 'Mysuru' },
      receivingFacility: null,
      createdBy: { id: mockUsers.senderPhc.id, name: 'Dr. Ramesh', email: mockUsers.senderPhc.email, role: Role.SENDING_FACILITY },
      assignedTo: null,
      events: [],
    };
    existingCases[draftCase.id] = draftCase;
    existingCases[draftCase.caseId] = draftCase;

    // Mock User lookup
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      const user = Object.values(mockUsers).find((u) => u.id === args.where.id || u.email === args.where.email);
      return user ? ({ ...user, facility: null } as any) : null;
    });

    // Mock ReferralCase findFirst & findMany
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

    vi.spyOn(prisma.referralCase, 'findMany').mockImplementation(async (args: any) => {
      let list = Object.values(existingCases).filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx);
      if (args.where?.createdAt?.lte) {
        list = list.filter((c) => c.createdAt <= args.where.createdAt.lte);
      }
      if (args.where?.status?.in) {
        list = list.filter((c) => args.where.status.in.includes(c.status));
      }
      return list as any;
    });

    vi.spyOn(prisma.referralCase, 'count').mockImplementation(async () => {
      return Object.values(existingCases).filter((c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx).length;
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

    // Mock CaseEvent create
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

    // Mock CapacitySignal create
    vi.spyOn(prisma.capacitySignal, 'create').mockImplementation(async (args: any) => {
      const signal = {
        id: `sig-${Date.now()}-${existingSignals.length}`,
        ...args.data,
        createdAt: new Date(),
        facility: { id: args.data.facilityId, name: 'Cheluvamba Hospital', district: 'Mysuru' },
      };
      existingSignals.push(signal);
      return signal as any;
    });

    vi.spyOn(capacitiesService, 'recordCapacitySignal').mockImplementation(async (params) => {
      return await prisma.capacitySignal.create({
        data: {
          facilityId: params.facilityId,
          reasonCode: params.reasonCode,
          detail: params.detail || null,
          reportedById: params.reportedById,
          caseId: params.caseId || null,
        },
      } as any);
    });

    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);
  });

  describe('1. Capacity-Based Rejection & CapacitySignal Creation', () => {
    it('rejecting without a reason_code fails with validation error', async () => {
      const receiverToken = authService.generateToken(mockUsers.receiverDh);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-sub-001/reject',
        headers: {
          authorization: `Bearer ${receiverToken}`,
        },
        payload: {
          note: 'Cannot take patient due to full maternity ward',
          // missing reasonCode
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.fieldErrors.some((f: any) => f.field === 'reasonCode')).toBe(true);
      expect(existingSignals.length).toBe(0);
    });

    it('a capacity rejection produces exactly one CapacitySignal and moves case to REJECTED', async () => {
      const receiverToken = authService.generateToken(mockUsers.receiverDh);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-sub-001/reject',
        headers: {
          authorization: `Bearer ${receiverToken}`,
        },
        payload: {
          reasonCode: CapacityReasonCode.NO_BED,
          note: 'Maternity ICU and HDU at 100% occupancy',
        },
      });

      expect(res.statusCode).toBe(200);
      const updatedCase = JSON.parse(res.payload);
      expect(updatedCase.status).toBe(CaseStatus.REJECTED);

      // Verify EXACTLY ONE CapacitySignal is created
      expect(existingSignals.length).toBe(1);
      expect(existingSignals[0].facilityId).toBe(mockUsers.receiverDh.facilityId);
      expect(existingSignals[0].reasonCode).toBe(CapacityReasonCode.NO_BED);
      expect(existingSignals[0].caseId).toBe('case-sub-001');

      // Verify append-only CaseEvent
      const rejectEvents = existingEvents.filter((e) => e.type === 'REJECTED');
      expect(rejectEvents.length).toBe(1);
      expect(rejectEvents[0].payload.reasonCode).toBe(CapacityReasonCode.NO_BED);
    });
  });

  describe('2. Referral Redirection with Capacity Reason Code', () => {
    it('redirects referral to alternate facility and records exactly one CapacitySignal', async () => {
      const receiverToken = authService.generateToken(mockUsers.receiverDh);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-sub-001/redirect',
        headers: {
          authorization: `Bearer ${receiverToken}`,
        },
        payload: {
          targetFacilityId: mockUsers.alternateDh.facilityId,
          reasonCode: CapacityReasonCode.NO_CLINICIAN,
          note: 'On-duty obstetrician in emergency surgery, redirecting to KR Hospital',
        },
      });

      expect(res.statusCode).toBe(200);
      const updatedCase = JSON.parse(res.payload);
      expect(updatedCase.status).toBe(CaseStatus.REDIRECTED);
      expect(updatedCase.receivingFacilityId).toBe(mockUsers.alternateDh.facilityId);

      // Verify exactly one CapacitySignal was recorded for the redirecting facility
      expect(existingSignals.length).toBe(1);
      expect(existingSignals[0].reasonCode).toBe(CapacityReasonCode.NO_CLINICIAN);
      expect(existingSignals[0].facilityId).toBe(mockUsers.receiverDh.facilityId);
    });
  });

  describe('3. Facility Acceptance', () => {
    it('accepts pending referral and transitions status to ACCEPTED', async () => {
      const receiverToken = authService.generateToken(mockUsers.receiverDh);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-sub-001/accept',
        headers: {
          authorization: `Bearer ${receiverToken}`,
        },
        payload: {
          note: 'Labour room bed reserved, team ready',
          receivingUnit: 'Maternity High Risk Unit',
        },
      });

      expect(res.statusCode).toBe(200);
      const updatedCase = JSON.parse(res.payload);
      expect(updatedCase.status).toBe(CaseStatus.ACCEPTED);

      // Verify append-only CaseEvent
      const acceptEvents = existingEvents.filter((e) => e.type === 'ACCEPTED');
      expect(acceptEvents.length).toBe(1);
      expect(acceptEvents[0].toStatus).toBe(CaseStatus.ACCEPTED);
    });
  });

  describe('4. Arrival Recording & Unsubmitted Case Protection', () => {
    it('rejects arrival on a case that was never submitted (DRAFT)', async () => {
      const senderToken = authService.generateToken(mockUsers.senderPhc);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-draft-002/arrival',
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        payload: {
          delayReason: 'TRAFFIC_CONGESTION',
        },
      });

      expect(res.statusCode).toBe(422);
      expect(JSON.parse(res.payload).code).toBe('INVALID_TRANSITION');
      expect(JSON.parse(res.payload).message).toContain('never submitted');
    });

    it('records arrival on an accepted case with controlled delay reason', async () => {
      // Move case to ACCEPTED first
      existingCases['case-sub-001'].status = CaseStatus.ACCEPTED;
      const receiverToken = authService.generateToken(mockUsers.receiverDh);

      const arrivalTime = new Date().toISOString();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-sub-001/arrival',
        headers: {
          authorization: `Bearer ${receiverToken}`,
        },
        payload: {
          arrivedAt: arrivalTime,
          delayReason: 'TRAFFIC_CONGESTION',
          note: 'Delayed 20 mins due to highway construction',
        },
      });

      expect(res.statusCode).toBe(200);
      const updatedCase = JSON.parse(res.payload);
      expect(updatedCase.status).toBe(CaseStatus.ARRIVED);

      // Verify ARRIVED CaseEvent
      const arrivalEvents = existingEvents.filter((e) => e.type === 'ARRIVED');
      expect(arrivalEvents.length).toBe(1);
      expect(arrivalEvents[0].payload.delayReason).toBe('TRAFFIC_CONGESTION');
    });
  });

  describe('5. Supervisor Delayed Cases Filter', () => {
    it('a supervisor can filter cases delayed beyond a configured window', async () => {
      const supervisorToken = authService.generateToken(mockUsers.supervisor);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals?delayedBeyondMinutes=60',
        headers: {
          authorization: `Bearer ${supervisorToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.items.some((c: any) => c.id === 'case-sub-001')).toBe(true);
    });
  });
});
