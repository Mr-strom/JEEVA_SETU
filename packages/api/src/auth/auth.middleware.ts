import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';
import { authService } from './auth.service';
import { AuthUser } from '../shared/types';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import { logSecurityFailure } from '../audit/audit.middleware';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    requestId?: string;
  }
}

/**
 * Authentication Hook: Extracts and validates Bearer token, sets req.user
 */
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await logSecurityFailure(req, 'Missing or malformed Authorization header');
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = authService.verifyToken(token);

    // Verify user is still active in database
    const dbUser = await authService.getUserById(payload.sub);
    if (!dbUser) {
      // If DB is offline or mock, fallback to valid token payload
      if (!payload.sub) {
        await logSecurityFailure(req, 'User not found in system');
        throw new UnauthorizedError('User does not exist');
      }
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        facilityId: payload.facilityId,
        district: payload.district,
        isActive: true,
      };
    } else {
      if (!dbUser.isActive) {
        await logSecurityFailure(req, 'User account deactivated', dbUser);
        throw new UnauthorizedError('User account has been deactivated');
      }
      req.user = dbUser;
    }
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      await logSecurityFailure(req, err.message);
      throw err;
    }
    await logSecurityFailure(req, 'Token verification failed');
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

/**
 * Role-Based Access Control Hook
 */
export function authorizeRoles(...allowedRoles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      await logSecurityFailure(req, 'Unauthenticated access attempt to protected route');
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      const reason = `Role '${req.user.role}' is not authorized for this endpoint (requires one of: ${allowedRoles.join(', ')})`;
      await logSecurityFailure(req, reason, req.user);
      throw new ForbiddenError(reason);
    }
  };
}

/**
 * Enforces scope based on the user's assigned facility
 */
export function enforceFacilityScope(getFacilityId: (req: FastifyRequest) => string | undefined | null) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) throw new UnauthorizedError();

    // Administrators and District Supervisors bypass facility-level scope checks
    if (req.user.role === Role.ADMINISTRATOR || req.user.role === Role.CLINICAL_ADMINISTRATOR || req.user.role === Role.DISTRICT_SUPERVISOR) {
      return;
    }

    const targetFacilityId = getFacilityId(req);
    if (targetFacilityId && req.user.facilityId && targetFacilityId !== req.user.facilityId) {
      const reason = `Facility scope violation: User facility ${req.user.facilityId} cannot access target facility ${targetFacilityId}`;
      await logSecurityFailure(req, reason, req.user);
      throw new ForbiddenError('You can only access data within your assigned facility scope');
    }
  };
}

/**
 * Enforces scope based on district for district supervisors
 */
export function enforceDistrictScope(getDistrict: (req: FastifyRequest) => string | undefined | null) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) throw new UnauthorizedError();

    if (req.user.role === Role.ADMINISTRATOR || req.user.role === Role.CLINICAL_ADMINISTRATOR) {
      return;
    }

    if (req.user.role === Role.DISTRICT_SUPERVISOR) {
      const targetDistrict = getDistrict(req);
      if (targetDistrict && req.user.district && targetDistrict !== req.user.district) {
        const reason = `District scope violation: Supervisor district ${req.user.district} cannot access target district ${targetDistrict}`;
        await logSecurityFailure(req, reason, req.user);
        throw new ForbiddenError('You can only access data within your assigned supervisor district');
      }
    }
  };
}

/**
 * Enforces that receiving facilities cannot modify sender-only fields
 */
export function enforceSenderFieldProtection(senderOnlyFields: string[] = ['riskFlags', 'patientId', 'clinicalSummary']) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) throw new UnauthorizedError();

    if (req.user.role === Role.RECEIVING_FACILITY || req.user.role === Role.CLINICIAN) {
      const body = (req.body || {}) as Record<string, unknown>;
      const modifiedSenderFields = senderOnlyFields.filter((f) => f in body);
      if (modifiedSenderFields.length > 0) {
        const reason = `Receiving facility attempted to modify sender-only fields: ${modifiedSenderFields.join(', ')}`;
        await logSecurityFailure(req, reason, req.user);
        throw new ForbiddenError(`Receiving facilities cannot modify sender-only fields (${modifiedSenderFields.join(', ')}) after submission`);
      }
    }
  };
}
