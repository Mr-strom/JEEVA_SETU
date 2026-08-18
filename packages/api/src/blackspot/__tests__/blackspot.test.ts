import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CapacityReasonCode } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { BLACKSPOT_CONFIG } from '../../shared/constants';

describe('Phase 9B: Referral Blackspot Intelligence & Threshold Suppression', () => {
  let app: FastifyInstance;

  const mockSupervisorMysuru: AuthUser = {
    id: '11111111-1111-1111-1111-111111111105',
    email: 'supervisor.mysuru@jeevasetu.karnataka.gov.in',
    name: 'Dr. Savitha Rao (DHO Mysuru)',
    role: Role.DISTRICT_SUPERVISOR,
    district: 'Mysuru',
    isActive: true,
  };

  const mockAdmin: AuthUser = {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'admin.state@jeevasetu.karnataka.gov.in',
    name: 'Srikanth M (State Admin)',
    role: Role.ADMINISTRATOR,
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

  // Facility 1: 10 cases (Above threshold 5) -> MUST appear
  const facilityAboveThreshold = {
    id: 'fac-above-threshold-01',
    name: 'Cheluvamba Hospital',
    nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
    district: 'Mysuru',
    districtKn: 'ಮೈಸೂರು',
    type: 'TERTIARY_HOSPITAL',
    isActive: true,
  };

  // Facility 2: 4 cases (Below threshold 5) -> MUST be completely suppressed
  const facilityBelowThreshold = {
    id: 'fac-below-threshold-02',
    name: 'Small Rural CHC',
    nameKn: 'ಚಿಕ್ಕ ಗ್ರಾಮೀಣ ಸಿಎಚ್‌ಸಿ',
    district: 'Mysuru',
    districtKn: 'ಮೈಸೂರು',
    type: 'CHC',
    isActive: true,
  };

  // Facility 3: 8 cases in Bangalore Urban -> Appears for State Admin, filtered out for Mysuru supervisor
  const facilityBangalore = {
    id: 'fac-bangalore-03',
    name: 'Vani Vilas Hospital',
    nameKn: 'ವಾಣಿ ವಿಲಾಸ ಆಸ್ಪತ್ರೆ',
    district: 'Bangalore Urban',
    districtKn: 'ಬೆಂಗಳೂರು ನಗರ',
    type: 'TERTIARY_HOSPITAL',
    isActive: true,
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Mock user lookup
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === mockSupervisorMysuru.id || where.email === mockSupervisorMysuru.email) return mockSupervisorMysuru as any;
      if (where.id === mockAdmin.id || where.email === mockAdmin.email) return mockAdmin as any;
      return mockWorker as any;
    });

    // Mock facility lookup
    vi.spyOn(prisma.facility, 'findMany').mockImplementation(async ({ where }: any) => {
      const all = [facilityAboveThreshold, facilityBelowThreshold, facilityBangalore];
      if (where?.district) {
        return all.filter((f) => f.district === where.district) as any;
      }
      return all as any;
    });

    vi.spyOn(prisma.facility, 'findUnique').mockImplementation(async ({ where }: any) => {
      const all = [facilityAboveThreshold, facilityBelowThreshold, facilityBangalore];
      return all.find((f) => f.id === where.id) as any;
    });

    // Mock case lookup: returns 10 cases for facilityAboveThreshold, 4 cases for facilityBelowThreshold
    vi.spyOn(prisma.referralCase, 'findMany').mockImplementation(async ({ where }: any) => {
      if (where.receivingFacilityId === facilityAboveThreshold.id) {
        return Array.from({ length: 10 }, (_, i) => ({
          id: `case-above-${i}`,
          status: i < 4 ? 'REJECTED' : 'ACCEPTED',
          createdAt: new Date(),
          events: [
            { type: 'SUBMITTED', createdAt: new Date(Date.now() - 30 * 60 * 1000) },
            { type: i < 4 ? 'REJECTED' : 'ACCEPTED', createdAt: new Date() },
          ],
        })) as any;
      }
      if (where.receivingFacilityId === facilityBelowThreshold.id) {
        return Array.from({ length: 4 }, (_, i) => ({
          id: `case-below-${i}`,
          status: 'ACCEPTED',
          createdAt: new Date(),
          events: [],
        })) as any;
      }
      if (where.receivingFacilityId === facilityBangalore.id) {
        return Array.from({ length: 8 }, (_, i) => ({
          id: `case-blr-${i}`,
          status: 'ACCEPTED',
          createdAt: new Date(),
          events: [],
        })) as any;
      }
      return [] as any;
    });

    // Mock capacity signals
    vi.spyOn(prisma.capacitySignal, 'findMany').mockImplementation(async ({ where }: any) => {
      if (where.facilityId === facilityAboveThreshold.id) {
        return [
          { id: 'sig-1', caseId: 'case-above-0', reasonCode: CapacityReasonCode.NO_BED, createdAt: new Date() },
          { id: 'sig-2', caseId: 'case-above-1', reasonCode: CapacityReasonCode.NO_BED, createdAt: new Date() },
          { id: 'sig-3', caseId: 'case-above-2', reasonCode: CapacityReasonCode.SERVICE_UNAVAILABLE, createdAt: new Date() },
        ] as any;
      }
      return [] as any;
    });
  });

  describe('1. Threshold Suppression and Safety Disclaimer', () => {
    it('completely suppresses any facility with case count below minimum threshold (absent, not null)', async () => {
      const token = authService.generateToken(mockSupervisorMysuru);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);

      // Verify persistent disclaimer
      expect(body.disclaimer).toBe(BLACKSPOT_CONFIG.PILOT_DISCLAIMER);
      expect(body.minThreshold).toBe(5);

      // Facility with 10 cases MUST be present
      const above = body.blackspots.find((b: any) => b.facilityId === facilityAboveThreshold.id);
      expect(above).toBeDefined();
      expect(above.totalCases).toBe(10);
      expect(above.rejectionsCount).toBe(4);
      expect(above.rejectionRate).toBe(0.4);
      expect(above.capacitySignalsCount).toBe(3);

      // HARD SAFETY RULE: Facility with 4 cases (<5) MUST be completely absent from the array!
      const below = body.blackspots.find((b: any) => b.facilityId === facilityBelowThreshold.id);
      expect(below).toBeUndefined();
      expect(body.suppressedFacilitiesCount).toBe(1);
    });

    it('reads MIN_CASE_COUNT_BLACKSPOT_THRESHOLD dynamically from environment', async () => {
      const token = authService.generateToken(mockSupervisorMysuru);

      // 1. Lower threshold to 3 via environment variable -> 4 cases should now appear
      process.env.MIN_CASE_COUNT_BLACKSPOT_THRESHOLD = '3';
      let res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: { authorization: `Bearer ${token}` },
      });
      let body = JSON.parse(res.payload);
      expect(body.minThreshold).toBe(3);
      expect(body.blackspots.find((b: any) => b.facilityId === facilityBelowThreshold.id)).toBeDefined();

      // 2. Raise threshold to 12 via environment variable -> 10 cases should now be suppressed
      process.env.MIN_CASE_COUNT_BLACKSPOT_THRESHOLD = '12';
      res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: { authorization: `Bearer ${token}` },
      });
      body = JSON.parse(res.payload);
      expect(body.minThreshold).toBe(12);
      expect(body.blackspots.find((b: any) => b.facilityId === facilityAboveThreshold.id)).toBeUndefined();
      expect(body.blackspots.length).toBe(0);

      // Clean up env
      delete process.env.MIN_CASE_COUNT_BLACKSPOT_THRESHOLD;
    });

    it('returns zero patient-identifying fields anywhere in the blackspot response', async () => {
      const token = authService.generateToken(mockSupervisorMysuru);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const rawText = res.payload;

      // Verify no patient identifiers exist in output
      expect(rawText).not.toContain('patientName');
      expect(rawText).not.toContain('externalId');
      expect(rawText).not.toContain('phone');
      expect(rawText).not.toContain('age');
      expect(rawText).not.toContain('gravida');
    });
  });

  describe('2. Role Scoping and RBAC Gate', () => {
    it('district supervisor only receives blackspot aggregates within their assigned district', async () => {
      const token = authService.generateToken(mockSupervisorMysuru);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);

      body.blackspots.forEach((item: any) => {
        expect(item.district).toBe('Mysuru');
      });
      const blr = body.blackspots.find((b: any) => b.facilityId === facilityBangalore.id);
      expect(blr).toBeUndefined();
    });

    it('rejects frontline workers from accessing blackspot endpoints with 403 Forbidden', async () => {
      const workerToken = authService.generateToken(mockWorker);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: { authorization: `Bearer ${workerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('3. Facility Non-Identifying Signals Endpoint', () => {
    it('GET /api/v1/blackspot/facilities/:id/signals returns timestamps and reason codes without patient data', async () => {
      const token = authService.generateToken(mockSupervisorMysuru);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/blackspot/facilities/${facilityAboveThreshold.id}/signals`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.facilityId).toBe(facilityAboveThreshold.id);
      expect(body.totalSignals).toBe(3);
      expect(body.signals.length).toBe(3);
      expect(body.signals[0].reasonCode).toBe(CapacityReasonCode.NO_BED);

      // Verify no patient identifiers
      expect(res.payload).not.toContain('patient');
    });
  });
});
