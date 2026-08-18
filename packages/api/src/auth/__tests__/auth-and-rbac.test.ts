import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { buildApp } from '../../app';
import { authService } from '../auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';
import { enforceSenderFieldProtection, authenticate } from '../auth.middleware';

describe('FR-01: Authentication, RBAC and Scope Access', () => {
  let app: FastifyInstance;

  const mockUsers: Record<string, AuthUser> = {
    worker: {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      email: 'asha.radha@jeevasetu.internal',
      name: 'Radha Bai (ASHA)',
      role: Role.FRONTLINE_WORKER,
      facilityId: '22222222-2222-2222-2222-222222222203',
      district: 'Mysuru',
      isActive: true,
    },
    receivingFacility: {
      id: 'cccc3333-3333-3333-3333-333333333333',
      email: 'referrals.cheluvamba@jeevasetu.internal',
      name: 'Cheluvamba Referral Desk',
      role: Role.RECEIVING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222201',
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
    admin: {
      id: 'ffff6666-6666-6666-6666-666666666666',
      email: 'admin.karnataka@jeevasetu.internal',
      name: 'System Admin',
      role: Role.ADMINISTRATOR,
      facilityId: null,
      district: null,
      isActive: true,
    },
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });

    // Mock DB calls for fast and isolated unit/API tests
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      const user = Object.values(mockUsers).find((u) => u.id === args.where.id || u.email === args.where.email);
      if (!user) return null as any;
      return {
        ...user,
        facility: user.facilityId
          ? {
              id: user.facilityId,
              name: 'Cheluvamba Hospital',
              nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
              district: user.district || 'Mysuru',
              type: 'MC',
            }
          : null,
      } as any;
    });

    vi.spyOn(prisma.user, 'findMany').mockResolvedValue(Object.values(mockUsers) as any);

    vi.spyOn(prisma.user, 'update').mockImplementation(async (args: any) => {
      const target = Object.values(mockUsers).find((u) => u.id === args.where.id);
      if (!target) throw new Error('Not found');
      const updated = { ...target, ...args.data };
      mockUsers[target.role.toLowerCase()] = updated;
      return updated as any;
    });

    vi.spyOn(prisma.facility, 'findUnique').mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital',
      nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'MC',
      specialties: ['OBSTETRICS', 'NICU'],
      capacityBeds: 200,
      isActive: true,
    } as any);

    vi.spyOn(prisma.facility, 'findMany').mockResolvedValue([
      {
        id: '22222222-2222-2222-2222-222222222201',
        name: 'Cheluvamba Hospital',
        nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
        district: 'Mysuru',
        districtKn: 'ಮೈಸೂರು',
        type: 'MC',
        specialties: ['OBSTETRICS', 'NICU'],
        capacityBeds: 200,
        isActive: true,
      },
    ] as any);

    vi.spyOn(prisma.referralCase, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.capacitySignal, 'findMany').mockResolvedValue([]);
    vi.spyOn(auditService, 'recordSecurityEvent').mockResolvedValue({} as any);
    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);
  });

  describe('1. Authentication Hook & GET /api/v1/me', () => {
    it('rejects unauthenticated requests with 401 and standard error envelope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.requestId).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    it('returns user profile and assigned facility for authenticated user', async () => {
      const token = authService.generateToken(mockUsers.worker);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe(mockUsers.worker.id);
      expect(body.email).toBe(mockUsers.worker.email);
      expect(body.role).toBe(Role.FRONTLINE_WORKER);
      expect(body.facilityId).toBe(mockUsers.worker.facilityId);
    });
  });

  describe('2. RBAC: Worker cannot access supervisor endpoints', () => {
    it('returns 403 Forbidden when frontline worker attempts to access supervisor blackspot summary', async () => {
      const token = authService.generateToken(mockUsers.worker);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
      expect(body.message).toContain('Role \'FRONTLINE_WORKER\' is not authorized');
      expect(auditService.recordSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FORBIDDEN_SCOPE_ACCESS',
          attemptedRole: Role.FRONTLINE_WORKER,
        }),
      );
    });

    it('allows district supervisor to access blackspot summary', async () => {
      const token = authService.generateToken(mockUsers.supervisor);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/blackspot/summary',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.disclaimer).toContain('Pilot-period, synthetic-data only');
    });
  });

  describe('3. Admin User Management & Deactivation', () => {
    it('blocks non-admin from listing users with 403 Forbidden', async () => {
      const token = authService.generateToken(mockUsers.worker);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
    });

    it('allows admin to list users and deactivate a user', async () => {
      const adminToken = authService.generateToken(mockUsers.admin);

      // List users
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(listRes.statusCode).toBe(200);
      expect(Array.isArray(JSON.parse(listRes.payload))).toBe(true);

      // Deactivate worker
      const deactivateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${mockUsers.worker.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          isActive: false,
        },
      });

      expect(deactivateRes.statusCode).toBe(200);
      const updatedUser = JSON.parse(deactivateRes.payload);
      expect(updatedUser.isActive).toBe(false);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'User',
          entityId: mockUsers.worker.id,
        }),
      );
    });

    it('rejects deactivated user on subsequent requests', async () => {
      // Mock user is inactive in DB
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUsers.worker,
        isActive: false,
      } as any);

      const token = authService.generateToken(mockUsers.worker);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.payload).message).toContain('deactivated');
    });
  });

  describe('4. Sender-Only Field Protection for Receiving Facility', () => {
    it('blocks receiving facility from modifying sender-only fields', async () => {
      // Create a test endpoint protected with authenticate + enforceSenderFieldProtection middleware
      app.post('/api/v1/referrals/test-case/edit', {
        preHandler: [authenticate, enforceSenderFieldProtection(['riskFlags', 'clinicalSummary'])],
        handler: async () => ({ success: true }),
      });

      // Inject request simulating receiving facility attempting to overwrite riskFlags
      const token = authService.generateToken(mockUsers.receivingFacility);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/test-case/edit',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          riskFlags: ['MODIFIED_FLAG'],
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).message).toContain('Receiving facilities cannot modify sender-only fields');
    });
  });

  describe('5. Facility Directory Listing', () => {
    it('allows authenticated users to query facilities with district filtering', async () => {
      const token = authService.generateToken(mockUsers.worker);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/facilities?district=Mysuru',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const list = JSON.parse(res.payload);
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].district).toBe('Mysuru');
    });
  });

  describe('6. Security Failure Auditing', () => {
    it('records security audit event on failed login', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/token',
        payload: {
          email: 'unknown.user@jeevasetu.internal',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(auditService.recordSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILURE',
          actorEmail: 'unknown.user@jeevasetu.internal',
        }),
      );
    });
  });
});
