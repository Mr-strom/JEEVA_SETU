import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role, CaseStatus, DispositionCategory } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';

describe('Phase 10: Security, Adversarial Testing & Zero-Data-Leak Verification', () => {
  let app: FastifyInstance;

  // Actors across different facilities and districts
  const workerFacility1: AuthUser = {
    id: 'user-worker-mysuru-01',
    email: 'asha.mysuru@jeevasetu.gov.in',
    name: 'Radha (ASHA Mysuru)',
    role: Role.FRONTLINE_WORKER,
    facilityId: 'fac-phc-mysuru',
    district: 'Mysuru',
    isActive: true,
  };

  const workerFacility2: AuthUser = {
    id: 'user-worker-kalaburagi-02',
    email: 'asha.kalaburagi@jeevasetu.gov.in',
    name: 'Renuka (ASHA Kalaburagi)',
    role: Role.FRONTLINE_WORKER,
    facilityId: 'fac-phc-kalaburagi',
    district: 'Kalaburagi',
    isActive: true,
  };

  const receivingHospitalA: AuthUser = {
    id: 'user-triage-cheluvamba',
    email: 'triage.cheluvamba@jeevasetu.gov.in',
    name: 'Cheluvamba Triage Desk',
    role: Role.RECEIVING_FACILITY,
    facilityId: 'fac-cheluvamba-hospital',
    district: 'Mysuru',
    isActive: true,
  };

  const receivingHospitalB: AuthUser = {
    id: 'user-triage-vanivilas',
    email: 'triage.vanivilas@jeevasetu.gov.in',
    name: 'Vani Vilas Triage Desk',
    role: Role.RECEIVING_FACILITY,
    facilityId: 'fac-vanivilas-hospital',
    district: 'Bangalore Urban',
    isActive: true,
  };

  const clinicianUser: AuthUser = {
    id: 'user-clinician-mysuru',
    email: 'dr.obgyn@jeevasetu.gov.in',
    name: 'Dr. Savitha (OB/GYN)',
    role: Role.CLINICIAN,
    facilityId: 'fac-cheluvamba-hospital',
    district: 'Mysuru',
    isActive: true,
  };

  // Case belonging strictly to workerFacility1 and receivingHospitalA
  const caseBelongingToFacilityA = {
    id: 'case-secret-target-001',
    caseId: 'JS-2026-000999',
    patientId: 'pat-target-001',
    sendingFacilityId: 'fac-phc-mysuru',
    receivingFacilityId: 'fac-cheluvamba-hospital',
    status: CaseStatus.SUBMITTED,
    createdById: workerFacility1.id,
    assignedToId: workerFacility1.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: { id: 'pat-target-001', externalId: 'ORS-CONFIDENTIAL' },
    sendingFacility: { id: 'fac-phc-mysuru', name: 'Mysuru PHC', district: 'Mysuru' },
    receivingFacility: { id: 'fac-cheluvamba-hospital', name: 'Cheluvamba Hospital', district: 'Mysuru' },
    createdBy: { id: workerFacility1.id, name: workerFacility1.name, role: Role.FRONTLINE_WORKER },
    assignedTo: { id: workerFacility1.id, name: workerFacility1.name, role: Role.FRONTLINE_WORKER },
    events: [],
    dispositions: [],
    followUpTasks: [],
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    const allUsers = [workerFacility1, workerFacility2, receivingHospitalA, receivingHospitalB, clinicianUser];
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      const u = allUsers.find((user) => user.id === where.id || user.email === where.email);
      return u ? ({ ...u, facility: null } as any) : null;
    });

    const caseLookup = async ({ where }: any) => {
      if (
        where?.id === caseBelongingToFacilityA.id ||
        where?.caseId === caseBelongingToFacilityA.caseId ||
        where?.OR?.some((o: any) => o.id === caseBelongingToFacilityA.id || o.caseId === caseBelongingToFacilityA.caseId)
      ) {
        return caseBelongingToFacilityA as any;
      }
      return null;
    };

    vi.spyOn(prisma.referralCase, 'findUnique').mockImplementation(caseLookup);
    vi.spyOn(prisma.referralCase, 'findFirst').mockImplementation(caseLookup);
    vi.spyOn(prisma.caseEvent, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.caseEvent, 'create').mockResolvedValue({ id: 'ev-mock-01' } as any);

    vi.spyOn(auditService, 'recordSecurityEvent').mockResolvedValue({} as any);
    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);
  });

  describe('1. IDOR (Insecure Direct Object Reference) Protection', () => {
    it('blocks unauthorized frontline worker from viewing a case belonging to another worker/facility', async () => {
      const unauthorizedWorkerToken = authService.generateToken(workerFacility2);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/referrals/${caseBelongingToFacilityA.id}`,
        headers: { authorization: `Bearer ${unauthorizedWorkerToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('blocks unauthorized receiving hospital from accepting a case dispatched to another hospital', async () => {
      const unauthorizedHospitalToken = authService.generateToken(receivingHospitalB);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseBelongingToFacilityA.id}/accept`,
        headers: {
          authorization: `Bearer ${unauthorizedHospitalToken}`,
          'idempotency-key': 'idemp-idor-accept-001',
        },
        payload: { unitName: 'Intrusion Attempt' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Role Bypass Protection (Direct API Calls)', () => {
    it('rejects frontline worker attempting to record clinical disposition with 403 Forbidden', async () => {
      const workerToken = authService.generateToken(workerFacility1);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseBelongingToFacilityA.id}/disposition`,
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-bypass-disp-001',
        },
        payload: {
          category: DispositionCategory.ADMITTED,
          unitName: 'Unauthorized Ward',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('rejects frontline worker attempting to create escalation playbooks with 403 Forbidden', async () => {
      const workerToken = authService.generateToken(workerFacility1);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/playbooks',
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-bypass-pb-001',
        },
        payload: {
          gapPhase: 'ACKNOWLEDGEMENT',
          gapCauseClass: 'PROCESS',
          title: 'Malicious Playbook',
          steps: [{ stepOrder: 1, actionDescription: 'Bad Step', assignedRole: Role.ADMINISTRATOR, slaMinutes: 30 }],
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('rejects frontline worker attempting to confirm re-routes with 403 Forbidden', async () => {
      const workerToken = authService.generateToken(workerFacility1);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseBelongingToFacilityA.id}/confirm-reroute`,
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-bypass-reroute-001',
        },
        payload: {
          targetFacilityId: 'fac-vanivilas-hospital',
          overrideReason: 'Illegal attempt',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('3. Token Handling & Authentication Failures', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed token strings with 401 Unauthorized', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals',
        headers: { authorization: 'Bearer invalid-token-structure' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('rejects tokens with forged/tampered signatures with 401 Unauthorized', async () => {
      const validToken = authService.generateToken(workerFacility1);
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature123`;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/referrals',
        headers: { authorization: `Bearer ${tamperedToken}` },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('4. Input Validation & Payload Handling', () => {
    it('rejects referral creation missing mandatory clinical fields with 400 Bad Request', async () => {
      const workerToken = authService.generateToken(workerFacility1);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals',
        headers: {
          authorization: `Bearer ${workerToken}`,
          'idempotency-key': 'idemp-val-001',
        },
        payload: {
          // Missing patient object entirely
          referral: {
            receivingFacilityId: 'fac-cheluvamba-hospital',
          },
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid enum values gracefully with 400 Bad Request', async () => {
      const hospitalToken = authService.generateToken(receivingHospitalA);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/referrals/${caseBelongingToFacilityA.id}/reject`,
        headers: {
          authorization: `Bearer ${hospitalToken}`,
          'idempotency-key': 'idemp-val-002',
        },
        payload: {
          reasonCode: 'NON_EXISTENT_CAPACITY_CODE',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('5. Zero-Data-Leak & Privacy Hygiene Verification', () => {
    it('ensures error envelopes never leak patient names or identifying information', async () => {
      const unauthorizedWorkerToken = authService.generateToken(workerFacility2);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/referrals/${caseBelongingToFacilityA.id}`,
        headers: { authorization: `Bearer ${unauthorizedWorkerToken}` },
      });

      const rawPayload = res.payload;
      // Guarantee no patient data leaks in error bodies
      expect(rawPayload).not.toContain('Lakshmi');
      expect(rawPayload).not.toContain('ORS-CONFIDENTIAL');
      expect(rawPayload).not.toContain('phone');
    });
  });
});
