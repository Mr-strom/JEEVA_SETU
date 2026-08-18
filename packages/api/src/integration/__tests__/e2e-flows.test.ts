import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CaseStatus, CapacityReasonCode, DispositionCategory, FollowUpType, FollowUpOutcome } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';

describe('Phase 10: Full End-to-End Integration Flows (JS-0001 & JS-0002)', () => {
  let app: FastifyInstance;

  // Real actors in referral network
  const ashaWorker: AuthUser = {
    id: '11111111-1111-1111-1111-111111111101',
    email: 'asha.radha@jeevasetu.karnataka.gov.in',
    name: 'Radha Bai (ASHA)',
    role: Role.FRONTLINE_WORKER,
    facilityId: '11111111-1111-1111-1111-111111111103',
    district: 'Mysuru',
    isActive: true,
  };

  const receivingFacilityB: AuthUser = {
    id: '22222222-2222-2222-2222-222222222201',
    email: 'triage.cheluvamba@jeevasetu.karnataka.gov.in',
    name: 'Triage Desk (Cheluvamba Hospital)',
    role: Role.RECEIVING_FACILITY,
    facilityId: '22222222-2222-2222-2222-222222222201',
    district: 'Mysuru',
    isActive: true,
  };

  const clinicianB: AuthUser = {
    id: '22222222-2222-2222-2222-222222222202',
    email: 'dr.savitha.obgyn@jeevasetu.karnataka.gov.in',
    name: 'Dr. Savitha (OB/GYN Cheluvamba)',
    role: Role.CLINICIAN,
    facilityId: '22222222-2222-2222-2222-222222222201',
    district: 'Mysuru',
    isActive: true,
  };

  const alternateFacilityC: AuthUser = {
    id: '33333333-3333-3333-3333-333333333301',
    email: 'triage.krhospital@jeevasetu.karnataka.gov.in',
    name: 'Triage Desk (KR Hospital)',
    role: Role.RECEIVING_FACILITY,
    facilityId: '33333333-3333-3333-3333-333333333301',
    district: 'Mysuru',
    isActive: true,
  };

  const clinicianC: AuthUser = {
    id: '33333333-3333-3333-3333-333333333302',
    email: 'dr.raghu.obgyn@jeevasetu.karnataka.gov.in',
    name: 'Dr. Raghu (OB/GYN KR Hospital)',
    role: Role.CLINICIAN,
    facilityId: '33333333-3333-3333-3333-333333333301',
    district: 'Mysuru',
    isActive: true,
  };

  const supervisorMysuru: AuthUser = {
    id: '55555555-5555-5555-5555-555555555501',
    email: 'supervisor.mysuru@jeevasetu.karnataka.gov.in',
    name: 'Dr. Savitha Rao (DHO Supervisor)',
    role: Role.DISTRICT_SUPERVISOR,
    facilityId: null,
    district: 'Mysuru',
    isActive: true,
  };

  const facilitiesDb = [
    {
      id: '11111111-1111-1111-1111-111111111103',
      name: 'Bilikere PHC',
      nameKn: 'ಬಿಳಿಕೆರೆ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರ',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'PHC',
      specialties: ['PRIMARY_CARE'],
      capacityBeds: 6,
      isActive: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital (MMCRI)',
      nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'TERTIARY_HOSPITAL',
      specialties: ['OBSTETRICS', 'NICU', 'BLOOD_BANK', 'ICU'],
      capacityBeds: 400,
      isActive: true,
    },
    {
      id: '33333333-3333-3333-3333-333333333301',
      name: 'KR Hospital Mysuru',
      nameKn: 'ಕೆ.ಆರ್. ಆಸ್ಪತ್ರೆ ಮೈಸೂರು',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'TERTIARY_HOSPITAL',
      specialties: ['OBSTETRICS', 'ICU', 'BLOOD_BANK', 'GENERAL_SURGERY'],
      capacityBeds: 500,
      isActive: true,
    },
  ];

  // In-memory relational state simulating database
  const casesDb: Record<string, any> = {};
  const eventsDb: any[] = [];
  const signalsDb: any[] = [];
  const followUpsDb: any[] = [];
  const dispositionsDb: any[] = [];

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Reset stores
    Object.keys(casesDb).forEach((k) => delete casesDb[k]);
    eventsDb.length = 0;
    signalsDb.length = 0;
    followUpsDb.length = 0;
    dispositionsDb.length = 0;

    // Mock Prisma User lookup
    const allUsers = [ashaWorker, receivingFacilityB, clinicianB, alternateFacilityC, clinicianC, supervisorMysuru];
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      const u = allUsers.find((user) => user.id === where.id || user.email === where.email);
      return u ? ({ ...u, facility: null } as any) : null;
    });

    // Mock Prisma Facility lookup
    vi.spyOn(prisma.facility, 'findUnique').mockImplementation(async ({ where }: any) => {
      return facilitiesDb.find((f) => f.id === where.id) as any;
    });
    vi.spyOn(prisma.facility, 'findMany').mockImplementation(async ({ where }: any) => {
      if (where?.id?.notIn) {
        return facilitiesDb.filter((f) => !where.id.notIn.includes(f.id)) as any;
      }
      if (where?.district) {
        return facilitiesDb.filter((f) => f.district === where.district) as any;
      }
      return facilitiesDb as any;
    });

    // Mock PatientReference
    vi.spyOn(prisma.patientReference, 'create').mockImplementation(async ({ data }: any) => {
      return { id: '00000000-0000-0000-0000-000000000001', ...data, createdAt: new Date(), updatedAt: new Date() };
    });
    vi.spyOn(prisma.patientReference, 'upsert').mockImplementation(async ({ create, update }: any) => {
      return { id: '00000000-0000-0000-0000-000000000001', ...create, createdAt: new Date(), updatedAt: new Date() };
    });

    // Mock ReferralCase CRUD
    vi.spyOn(prisma.referralCase, 'create').mockImplementation(async ({ data }: any) => {
      const newCase = {
        id: '10000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: { id: data.patientId, externalId: 'ORS-987654' },
        sendingFacility: facilitiesDb.find((f) => f.id === data.sendingFacilityId),
        receivingFacility: facilitiesDb.find((f) => f.id === data.receivingFacilityId),
        createdBy: { id: data.createdById, name: ashaWorker.name, role: Role.FRONTLINE_WORKER },
        assignedTo: { id: data.assignedToId, name: ashaWorker.name, role: Role.FRONTLINE_WORKER },
        events: [],
        dispositions: [],
        followUpTasks: [],
      };
      casesDb[newCase.id] = newCase;
      casesDb[newCase.caseId] = newCase;
      return newCase as any;
    });

    const getCaseHelper = ({ where }: any) => {
      const c =
        (where.id && casesDb[where.id]) ||
        (where.caseId && casesDb[where.caseId]) ||
        (where.OR && (casesDb[where.OR[0]?.id] || casesDb[where.OR[1]?.caseId]));
      if (!c) return null;
      return {
        ...c,
        events: eventsDb.filter((e) => e.caseId === c.id || e.referralCaseId === c.id),
        dispositions: dispositionsDb.filter((d) => d.caseId === c.id),
        followUpTasks: followUpsDb.filter((f) => f.referralCaseId === c.id),
        capacitySignals: signalsDb.filter((s) => s.caseId === c.id),
        patient: c.patient || { id: 'pat-01', externalId: 'ORS-987654' },
        sendingFacility: c.sendingFacility || facilitiesDb[0],
        receivingFacility: c.receivingFacility || facilitiesDb[1],
      };
    };

    vi.spyOn(prisma.referralCase, 'findUnique').mockImplementation(async (args: any) => getCaseHelper(args) as any);
    vi.spyOn(prisma.referralCase, 'findFirst').mockImplementation(async (args: any) => getCaseHelper(args) as any);

    vi.spyOn(prisma.referralCase, 'update').mockImplementation(async ({ where, data }: any) => {
      const c = casesDb[where.id] || casesDb[where.caseId];
      if (!c) throw new Error('Not found');
      Object.assign(c, data);
      c.updatedAt = new Date();
      if (data.receivingFacilityId) {
        c.receivingFacility = facilitiesDb.find((f) => f.id === data.receivingFacilityId);
      }
      return {
        ...c,
        followUpTasks: followUpsDb.filter((f) => f.caseId === c.id || f.referralCaseId === c.id),
        events: eventsDb.filter((e) => e.caseId === c.id || e.referralCaseId === c.id),
        dispositions: dispositionsDb.filter((d) => d.caseId === c.id),
        patient: c.patient || { id: 'pat-01', externalId: 'ORS-987654' },
        sendingFacility: c.sendingFacility || facilitiesDb[0],
        receivingFacility: c.receivingFacility || facilitiesDb[1],
      } as any;
    });

    // Mock CaseEvent
    vi.spyOn(prisma.caseEvent, 'create').mockImplementation(async ({ data }: any) => {
      const event = {
        id: 'ev-' + Math.random().toString(36).substring(2, 8),
        ...data,
        createdAt: new Date(),
      };
      eventsDb.push(event);
      return event as any;
    });

    vi.spyOn(prisma.caseEvent, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.caseEvent, 'findMany').mockImplementation(async ({ where }: any) => {
      return eventsDb.filter((e) => e.caseId === where.caseId || e.referralCaseId === where.caseId) as any;
    });

    // Mock CapacitySignal
    vi.spyOn(prisma.capacitySignal, 'create').mockImplementation(async ({ data }: any) => {
      const signal = { id: 'sig-' + Math.random().toString(36).substring(2, 8), ...data, createdAt: new Date() };
      signalsDb.push(signal);
      return signal as any;
    });

    // Mock Disposition
    vi.spyOn(prisma.disposition, 'create').mockImplementation(async ({ data }: any) => {
      const d = { id: 'disp-' + Math.random().toString(36).substring(2, 8), ...data, createdAt: new Date() };
      dispositionsDb.push(d);
      return d as any;
    });
    vi.spyOn(prisma.disposition, 'upsert').mockImplementation(async ({ create }: any) => {
      const d = { id: 'disp-' + Math.random().toString(36).substring(2, 8), ...create, createdAt: new Date() };
      dispositionsDb.push(d);
      return d as any;
    });

    // Mock FollowUpTask
    vi.spyOn(prisma.followUpTask, 'create').mockImplementation(async ({ data }: any) => {
      const cId = data.caseId || data.referralCaseId;
      const f = {
        id: '20000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        ...data,
        caseId: cId,
        referralCaseId: cId,
        status: 'PENDING',
        outcome: null,
        notes: null,
        createdAt: new Date(),
        referralCase: casesDb[cId],
        assignedTo: ashaWorker,
      };
      followUpsDb.push(f);
      return f as any;
    });

    vi.spyOn(prisma.followUpTask, 'findUnique').mockImplementation(async ({ where }: any) => {
      const f = followUpsDb.find((item) => item.id === where.id);
      if (!f) return null;
      const targetCase = casesDb[f.caseId || f.referralCaseId];
      return {
        ...f,
        case: targetCase,
        referralCase: targetCase,
      } as any;
    });

    vi.spyOn(prisma.followUpTask, 'update').mockImplementation(async ({ where, data }: any) => {
      const f = followUpsDb.find((item) => item.id === where.id);
      if (!f) throw new Error('Not found');
      Object.assign(f, data);
      return f as any;
    });

    vi.spyOn(prisma.followUpTask, 'findMany').mockImplementation(async () => {
      return followUpsDb.map((f) => ({ ...f, referralCase: casesDb[f.caseId || f.referralCaseId] })) as any;
    });

    // Mock RoutingSuggestion
    vi.spyOn(prisma.routingSuggestion, 'upsert').mockResolvedValue({} as any);
    vi.spyOn(prisma.routingSuggestion, 'updateMany').mockResolvedValue({ count: 1 } as any);

    // Mock Prisma Transaction
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }
      return callback;
    });

    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);
    vi.spyOn(auditService, 'recordSecurityEvent').mockResolvedValue({} as any);
  });

  describe('1. Flow JS-0001: Standard Closed-Loop Care Pathway (Normal Flow)', () => {
    it('executes full lifecycle from referral creation to care closure across all real endpoints', async () => {
      const workerToken = authService.generateToken(ashaWorker);
      const receivingDeskToken = authService.generateToken(receivingFacilityB);
      const clinicianToken = authService.generateToken(clinicianB);

      // Step 1: Frontline worker creates referral case
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-js0001-create-001',
        },
        payload: {
          isDraft: false,
          sendingFacilityId: '11111111-1111-1111-1111-111111111103',
          receivingFacilityId: '22222222-2222-2222-2222-222222222201',
          patientExternalId: 'ORS-987654',
          patientName: 'Lakshmi Devi',
          patientAge: 24,
          gravida: 2,
          parity: 1,
          riskFlags: ['PRE_ECLAMPSIA', 'SEVERE_ANAEMIA'],
          transportNeeded: true,
          transportMode: '108_AMBULANCE',
          clinicalSummary: 'Severe headache, BP 160/110, severe anaemia Hb 6.8 g/dL',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createdCase = JSON.parse(createRes.payload);
      expect(createdCase.id).toBeDefined();
      expect(createdCase.caseId).toMatch(/^JS-\d{4}-[A-Z0-9]{6}$/);
      expect(createdCase.status).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);
      const caseDbId = createdCase.id;

      // Step 2: Receiving facility accepts referral case
      const acceptRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/accept`,
        headers: {
          authorization: `Bearer ${receivingDeskToken}`,
          'idempotency-key': 'idemp-js0001-accept-001',
        },
        payload: {
          unitName: 'Maternal ICU / Labour Room 3',
        },
      });

      expect(acceptRes.statusCode).toBe(200);
      const acceptedCase = JSON.parse(acceptRes.payload);
      expect(acceptedCase.status).toBe(CaseStatus.ACCEPTED);

      // Step 3: Transport & Patient Arrival recorded at hospital
      const arrivalRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/arrival`,
        headers: {
          authorization: `Bearer ${receivingDeskToken}`,
          'idempotency-key': 'idemp-js0001-arrival-001',
        },
        payload: {
          arrivedAt: new Date().toISOString(),
          delayReason: 'TRAFFIC_CONGESTION',
        },
      });

      expect(arrivalRes.statusCode).toBe(200);
      const arrivedCase = JSON.parse(arrivalRes.payload);
      expect(arrivedCase.status).toBe(CaseStatus.ARRIVED);

      // Step 4: Clinician evaluates patient and records clinical disposition
      const dispRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/disposition`,
        headers: {
          authorization: `Bearer ${clinicianToken}`,
          'idempotency-key': 'idemp-js0001-disp-001',
        },
        payload: {
          category: DispositionCategory.ADMITTED,
          unitName: 'High Dependency Maternity Unit',
          clinicalNotes: 'Magnesium sulphate administered, emergency caesarean section successfully performed. Baby stabilized in NICU.',
        },
      });

      expect(dispRes.statusCode).toBe(200);
      const dispCase = JSON.parse(dispRes.payload);
      expect(dispCase.status).toBe(CaseStatus.CLINICAL_DISPOSITION_RECORDED);

      // Step 5: Patient discharged, scheduling mandatory home follow-up task
      const dischargeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/discharge`,
        headers: {
          authorization: `Bearer ${clinicianToken}`,
          'idempotency-key': 'idemp-js0001-discharge-001',
        },
        payload: {
          dischargeSummary: 'Mother BP normal (120/80), baby feeding well, discharged in stable condition.',
          followUpDueDays: 3,
          followUpType: FollowUpType.HOME_VISIT,
          followUpNotes: 'Check maternal blood pressure, surgical suture healing, and infant feeding.',
        },
      });

      expect(dischargeRes.statusCode).toBe(200);
      const dischargedCase = JSON.parse(dischargeRes.payload);
      expect(dischargedCase.status).toBe(CaseStatus.FOLLOW_UP_DUE);
      expect(dischargedCase.followUpTasks.length).toBeGreaterThan(0);
      const taskId = dischargedCase.followUpTasks[0].id;

      // Step 6: Frontline worker completes scheduled post-discharge home visit
      const completeTaskRes = await app.inject({
        method: 'POST',
        url: `/api/v1/follow-ups/${taskId}/complete`,
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-js0001-task-complete-001',
        },
        payload: {
          outcome: FollowUpOutcome.COMPLETED,
          notes: 'Mother visited at home. BP 118/78, wound clean with no infection, baby active.',
        },
      });

      expect(completeTaskRes.statusCode).toBe(200);
      const completedTask = JSON.parse(completeTaskRes.payload);
      expect(completedTask.outcome).toBe(FollowUpOutcome.COMPLETED);
      expect(completedTask.completedAt).toBeDefined();

      // Step 7: Referral case is formally closed
      const closeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/close`,
        headers: {
          authorization: `Bearer ${clinicianToken}`,
          'idempotency-key': 'idemp-js0001-close-001',
        },
        payload: {
          closureReason: 'Full maternal-infant referral loop successfully completed with documented home visit recovery.',
        },
      });

      expect(closeRes.statusCode).toBe(200);
      const closedCase = JSON.parse(closeRes.payload);
      expect(closedCase.status).toBe(CaseStatus.CLOSED);

      // Step 8: Timeline audit check - all append-only events present in strict order
      const timelineRes = await app.inject({
        method: 'GET',
        url: `/api/v1/referrals/${caseDbId}/timeline`,
        headers: { authorization: `Bearer ${workerToken}` },
      });

      expect(timelineRes.statusCode).toBe(200);
      const timeline = JSON.parse(timelineRes.payload);
      const eventTypes = timeline.map((e: any) => e.type);
      expect(eventTypes).toContain('SUBMITTED');
      expect(eventTypes).toContain('ACCEPTED');
      expect(eventTypes).toContain('ARRIVED');
      expect(eventTypes).toContain('CLINICAL_DISPOSITION_RECORDED');
      expect(eventTypes).toContain('DISCHARGED');
      expect(eventTypes).toContain('FOLLOW_UP_COMPLETED');
      expect(eventTypes).toContain('CLOSED');
    });
  });

  describe('2. Flow JS-0002: Capacity-Rejection, Alternate Routing & Re-entry Loop', () => {
    it('executes full rejection -> alternate suggestion -> reroute -> re-entry acknowledgement lifecycle', async () => {
      const workerToken = authService.generateToken(ashaWorker);
      const facilityBToken = authService.generateToken(receivingFacilityB);
      const supervisorToken = authService.generateToken(supervisorMysuru);
      const facilityCToken = authService.generateToken(alternateFacilityC);
      const clinicianCToken = authService.generateToken(clinicianC);

      // Step 1: Worker submits high-risk referral to Cheluvamba Hospital
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-js0002-create-001',
        },
        payload: {
          isDraft: false,
          sendingFacilityId: '11111111-1111-1111-1111-111111111103',
          receivingFacilityId: '22222222-2222-2222-2222-222222222201',
          patientExternalId: 'ORS-554433',
          patientName: 'Sunitha Kumari',
          patientAge: 28,
          riskFlags: ['PRE_ECLAMPSIA', 'OBSTRUCTED_LABOUR'],
          transportNeeded: true,
          transportMode: '108_AMBULANCE',
          clinicalSummary: 'Obstructed labour, second stage delay, fetal bradycardia',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createdCase = JSON.parse(createRes.payload);
      const caseDbId = createdCase.id;

      // Step 2: Cheluvamba rejects due to NO_BED capacity bottleneck
      const rejectRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/reject`,
        headers: {
          authorization: `Bearer ${facilityBToken}`,
          'idempotency-key': 'idemp-js0002-reject-001',
        },
        payload: {
          reasonCode: CapacityReasonCode.NO_BED,
          notes: 'All 12 obstetric ICU and labour beds full.',
        },
      });

      expect(rejectRes.statusCode).toBe(200);
      const rejectedCase = JSON.parse(rejectRes.payload);
      expect(rejectedCase.status).toBe(CaseStatus.REJECTED);

      // Verify immutable CapacitySignal generated
      expect(signalsDb.length).toBe(1);
      expect(signalsDb[0].reasonCode).toBe(CapacityReasonCode.NO_BED);
      expect(signalsDb[0].facilityId).toBe('22222222-2222-2222-2222-222222222201');

      // Step 3: Supervisor requests ranked alternate route suggestions
      const suggestionsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/referrals/${caseDbId}/route-suggestions`,
        headers: { authorization: `Bearer ${supervisorToken}` },
      });

      expect(suggestionsRes.statusCode).toBe(200);
      const suggestionsBody = JSON.parse(suggestionsRes.payload);
      expect(suggestionsBody.suggestions.length).toBeGreaterThan(0);

      // HARD SAFETY RULE: The rejecting facility (Cheluvamba) MUST be excluded from suggestions!
      const cheluvambaInSuggestions = suggestionsBody.suggestions.find((s: any) => s.suggestedFacilityId === '22222222-2222-2222-2222-222222222201');
      expect(cheluvambaInSuggestions).toBeUndefined();

      // KR Hospital is ranked #1
      const topPick = suggestionsBody.suggestions[0];
      expect(topPick.suggestedFacilityId).toBe('33333333-3333-3333-3333-333333333301');
      expect(topPick.score).toBeGreaterThan(0);

      // Step 4: Supervisor confirms re-route to KR Hospital
      const rerouteRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/confirm-reroute`,
        headers: {
          authorization: `Bearer ${supervisorToken}`,
          'idempotency-key': 'idemp-js0002-reroute-001',
        },
        payload: {
          targetFacilityId: '33333333-3333-3333-3333-333333333301',
          overrideReason: 'Selected top-ranked tertiary facility with available obstetric surgical theater.',
        },
      });

      expect(rerouteRes.statusCode).toBe(200);
      const reroutedCase = JSON.parse(rerouteRes.payload).case;
      // Case re-enters ACKNOWLEDGEMENT_PENDING at KR Hospital
      expect(reroutedCase.status).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);
      expect(reroutedCase.receivingFacilityId).toBe('33333333-3333-3333-3333-333333333301');

      // Verify original CapacitySignal and REJECTED event remain untouched
      expect(signalsDb.length).toBe(1);
      const eventTypes = eventsDb.map((e) => e.type);
      expect(eventTypes).toContain('REJECTED');
      expect(eventTypes).toContain('REROUTED');

      // Step 5: KR Hospital triage desk accepts the newly rerouted case
      const acceptRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/accept`,
        headers: {
          authorization: `Bearer ${facilityCToken}`,
          'idempotency-key': 'idemp-js0002-accept-001',
        },
        payload: {
          unitName: 'Emergency OT 2 / Labour Suite',
        },
      });

      expect(acceptRes.statusCode).toBe(200);
      const acceptedCase = JSON.parse(acceptRes.payload);
      expect(acceptedCase.status).toBe(CaseStatus.ACCEPTED);

      // Step 6: Patient arrives at KR Hospital, receives disposition, is discharged and closed
      await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/arrival`,
        headers: { authorization: `Bearer ${facilityCToken}`, 'idempotency-key': 'idemp-js0002-arr' },
        payload: { arrivedAt: new Date().toISOString() },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/disposition`,
        headers: { authorization: `Bearer ${clinicianCToken}`, 'idempotency-key': 'idemp-js0002-disp' },
        payload: { category: DispositionCategory.ADMITTED, unitName: 'Postnatal Ward' },
      });

      await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/discharge`,
        headers: { authorization: `Bearer ${clinicianCToken}`, 'idempotency-key': 'idemp-js0002-dc' },
        payload: { dischargeSummary: 'Recovered', followUpDueDays: 3, followUpType: FollowUpType.HOME_VISIT },
      });

      const closeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseDbId}/close`,
        headers: { authorization: `Bearer ${clinicianCToken}`, 'idempotency-key': 'idemp-js0002-cl' },
        payload: { closureReason: 'Successful recovery after emergency reroute.' },
      });

      expect(closeRes.statusCode).toBe(200);
      expect(JSON.parse(closeRes.payload).status).toBe(CaseStatus.CLOSED);
    });
  });
});
