import { FastifyRequest } from 'fastify';
import { auditService } from './audit.service';
import { AuthUser } from '../shared/types';

export async function logSecurityFailure(
  req: FastifyRequest,
  reason: string,
  user?: AuthUser,
) {
  await auditService.recordSecurityEvent({
    actorId: user?.id,
    actorEmail: user?.email,
    attemptedRole: user?.role,
    action: user ? 'FORBIDDEN_SCOPE_ACCESS' : 'UNAUTHORIZED_ACCESS',
    resource: req.url,
    reason,
    requestId: (req.headers['x-request-id'] as string) || (req.id as string),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
}
