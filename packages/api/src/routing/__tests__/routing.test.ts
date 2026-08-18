import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { CaseStatus, Role, CapacityReasonCode, AuditAction, GapPhase, GapCauseClass } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';
import { calculateRoutingSuggestions } from '../routing.engine';
import { FacilityCandidate } from '../routing.types';

describe('Phase 9A: Re-routing on Capacity Rejection & Suggestions Engine', () => {
  let app: FastifyInstance;

  const mockSupervisor: AuthUser = {
    id: '11111111-1111-1111-1111-111111111105',
    email: 'supervisor.mysuru@jeevasetu.karnataka.gov.in',
    name: 'Dr. Savitha Rao (DHO Mysuru)',
    role: Role.DISTRICT_SUPERVISOR,
    district: 'Mysuru',
    isActive: true,
  };

  const mockSendingFacility: AuthUser = {
    id: 'bbbb2222-2222-2222-2222-222222222222',
    email: 'mo.bilikere@jeevasetu.karnataka.gov.in',
    name: 'Dr. Suresh Kumar',
    role: Role.SENDING_FACILITY,
    facilityId: 'facility-bilikere-phc',
    district: 'Mysuru',
    isActive: true,
  };

  const candidateFacilities: FacilityCandidate[] = [
    {
      id: 'facility-cheluvamba',
      name: 'Cheluvamba Hospital',
      nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
      district: 'Mysuru',
      type: 'TERTIARY_HOSPITAL',
      specialties: ['OBSTETRICS', 'NICU', 'BLOOD_BANK', 'OT'],
      capacityBeds: 250,
      isActive: true,
    },
    {
      id: 'facility-kr-hospital',
      name: 'KR Hospital Mysuru',
      nameKn: 'ಕೆಆರ್ ಆಸ್ಪತ್ರೆ',
      district: 'Mysuru',
      type: 'TERTIARY_HOSPITAL',
      specialties: ['OBSTETRICS', 'ICU', 'BLOOD_BANK', 'OT'],
      capacityBeds: 300,
      isActive: true,
    },
    {
      id: 'facility-vani-vilas',
      name: 'Vani Vilas Hospital Bangalore',
      nameKn: 'ವಾಣಿ ವಿಲಾಸ ಆಸ್ಪತ್ರೆ',
      district: 'Bangalore Urban',
      type: 'TERTIARY_HOSPITAL',
      specialties: ['OBSTETRICS', 'NICU', 'ICU', 'BLOOD_BANK', 'OT'],
      capacityBeds: 400,
      isActive: true,
    },
  ];

  const initialRejectionEvent = {
    id: 'event-rejection-1',
    caseId: 'case-9a-001',
    type: 'REJECTED',
    fromStatus: CaseStatus.ACKNOWLEDGEMENT_PENDING,
    toStatus: CaseStatus.REJECTED,
    actorId: 'user-cheluvamba-desk',
    actorRole: Role.RECEIVING_FACILITY,
    facilityId: 'facility-cheluvamba',
    payload: {
      reasonCode: CapacityReasonCode.NO_BED,
      note: 'Labour ICU beds 100% occupied',
    },
    createdAt: new Date('2026-08-18T10:00:00Z'),
  };

  const initialCapacitySignal = {
    id: 'signal-cap-1',
    caseId: 'case-9a-001',
    facilityId: 'facility-cheluvamba',
    reasonCode: CapacityReasonCode.NO_BED,
    createdAt: new Date('2026-08-18T10:00:00Z'),
  };

  const mockCase = {
    id: 'case-9a-001',
    caseId: 'JS-2026-009901',
    sendingFacilityId: 'facility-bilikere-phc',
    receivingFacilityId: 'facility-cheluvamba',
    status: CaseStatus.REDIRECT_SUGGESTED,
    riskFlags: ['PRE_ECLAMPSIA', 'SEVERE_ANAEMIA'],
    acknowledgementDeadline: new Date('2026-08-18T10:15:00Z'),
    createdAt: new Date('2026-08-18T09:45:00Z'),
    updatedAt: new Date('2026-08-18T10:00:00Z'),
    patient: { externalId: 'ORS-KA-9901', age: 26 },
    sendingFacility: { id: 'facility-bilikere-phc', name: 'Bilikere PHC', district: 'Mysuru' },
    receivingFacility: { id: 'facility-cheluvamba', name: 'Cheluvamba Hospital', district: 'Mysuru' },
    events: [initialRejectionEvent],
    capacitySignals: [initialCapacitySignal],
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });
    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

    // Mock user lookup
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === mockSupervisor.id || where.email === mockSupervisor.email) return mockSupervisor as any;
      if (where.id === mockSendingFacility.id || where.email === mockSendingFacility.email) return mockSendingFacility as any;
      return null as any;
    });

    vi.spyOn(prisma.facility, 'findMany').mockResolvedValue(candidateFacilities as any);
    vi.spyOn(prisma.facility, 'findUnique').mockImplementation(async ({ where }: any) => {
      return candidateFacilities.find((f) => f.id === where.id) as any;
    });

    vi.spyOn(prisma.referralCase, 'findFirst').mockResolvedValue(mockCase as any);
    vi.spyOn(prisma.referralCase, 'update').mockImplementation(async ({ data }: any) => {
      return { ...mockCase, ...data, receivingFacility: candidateFacilities.find((f) => f.id === data.receivingFacilityId) } as any;
    });
    vi.spyOn(prisma.caseEvent, 'create').mockResolvedValue({} as any);
    vi.spyOn(prisma.routingSuggestion, 'upsert').mockResolvedValue({} as any);
    vi.spyOn(prisma.routingSuggestion, 'updateMany').mockResolvedValue({ count: 1 } as any);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => typeof cb === 'function' ? cb(prisma) : cb);
  });

  describe('1. Routing Engine Ranking & Exclusion Rules', () => {
    it('always excludes the rejecting facility and sending facility from suggested alternates', () => {
      const suggestions = calculateRoutingSuggestions({
        caseId: 'case-9a-001',
        sendingFacilityId: 'facility-bilikere-phc',
        rejectingFacilityId: 'facility-cheluvamba',
        district: 'Mysuru',
        riskFlags: ['PRE_ECLAMPSIA'],
        candidateFacilities,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestedIds = suggestions.map((s) => s.suggestedFacilityId);
      expect(suggestedIds).not.toContain('facility-cheluvamba');
      expect(suggestedIds).not.toContain('facility-bilikere-phc');
      expect(suggestedIds).toContain('facility-kr-hospital');
    });

    it('ranks candidate matching the same district and required clinical services at Rank #1', () => {
      const suggestions = calculateRoutingSuggestions({
        caseId: 'case-9a-001',
        sendingFacilityId: 'facility-bilikere-phc',
        rejectingFacilityId: 'facility-cheluvamba',
        district: 'Mysuru',
        riskFlags: ['PRE_ECLAMPSIA', 'SEVERE_ANAEMIA'],
        candidateFacilities,
      });

      expect(suggestions[0].rank).toBe(1);
      expect(suggestions[0].suggestedFacilityId).toBe('facility-kr-hospital');
      expect(suggestions[0].reasons).toContain('Same District (Mysuru)');
    });
  });

  describe('2. Endpoint GET /api/v1/referrals/:id/route-suggestions', () => {
    it('returns ranked alternates whenever network has candidates', async () => {
      const token = authService.generateToken(mockSupervisor);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals/case-9a-001/route-suggestions',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.hasAlternate).toBe(true);
      expect(body.suggestions.length).toBeGreaterThan(0);
      expect(body.suggestions[0].suggestedFacilityId).toBe('facility-kr-hospital');
    });

    it('triggers an immediate Escalation when no alternate is configured instead of leaving case in silent limbo', async () => {
      const token = authService.generateToken(mockSupervisor);

      // Mock zero eligible candidate facilities
      vi.spyOn(prisma.facility, 'findMany').mockResolvedValue([
        { id: 'facility-cheluvamba', name: 'Rejecting Facility', isActive: true, district: 'Mysuru', type: 'TH', specialties: [] },
      ] as any);

      vi.spyOn(prisma.playbook, 'findFirst').mockResolvedValue({ id: 'pb-cap-01' } as any);
      const gapCreateSpy = vi.spyOn(prisma.gapEvent, 'create').mockResolvedValue({ id: 'gap-emergency-01' } as any);
      const escCreateSpy = vi.spyOn(prisma.escalation, 'create').mockResolvedValue({ id: 'esc-emergency-01' } as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals/case-9a-001/route-suggestions',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.hasAlternate).toBe(false);
      expect(body.message).toBe('no alternate currently configured');

      // Verify immediate escalation created
      expect(gapCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phase: GapPhase.CAPACITY,
            causeClass: GapCauseClass.CAPACITY,
          }),
        }),
      );
      expect(escCreateSpy).toHaveBeenCalled();
    });
  });

  describe('3. Endpoint POST /api/v1/referrals/:id/confirm-reroute', () => {
    it('restarts acknowledgement clock at new destination and keeps original rejection CaseEvent & CapacitySignal byte-for-byte unchanged', async () => {
      const token = authService.generateToken(mockSupervisor);
      const auditSpy = vi.spyOn(auditService, 'record');

      // Snapshot original rejection event and capacity signal before mutation
      const originalRejectionSnapshot = JSON.stringify(initialRejectionEvent);
      const originalCapacitySignalSnapshot = JSON.stringify(initialCapacitySignal);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-9a-001/confirm-reroute',
        headers: {
          authorization: `Bearer ${token}`,
          'idempotency-key': 'reroute-test-key-001',
        },
        payload: {
          targetFacilityId: 'facility-kr-hospital',
          overrideReason: 'Supervisor confirmed ICU bed available in Ward 3 with Dr. Ananth',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.case.status).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);
      expect(body.case.receivingFacilityId).toBe('facility-kr-hospital');

      // Check acknowledgement timer was restarted into the future
      const restartedTime = new Date(body.acknowledgementDeadline).getTime();
      expect(restartedTime).toBeGreaterThan(Date.now());

      // Check immutable audit logging
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.RE_ROUTE,
          entity: 'ReferralCase',
          actorId: mockSupervisor.id,
        }),
      );

      // Verify that the original rejection event and capacity signal are byte-for-byte UNCHANGED
      expect(JSON.stringify(mockCase.events[0])).toBe(originalRejectionSnapshot);
      expect(JSON.stringify(mockCase.capacitySignals[0])).toBe(originalCapacitySignalSnapshot);
    });
  });
});
