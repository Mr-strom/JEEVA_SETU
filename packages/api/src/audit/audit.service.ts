import { AuditAction, Role } from '@prisma/client';
import { prisma } from '../shared/db';

export interface AuditEventParams {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecurityEventParams {
  actorId?: string;
  actorEmail?: string;
  attemptedRole?: Role | string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'FORBIDDEN_SCOPE_ACCESS' | 'UNAUTHORIZED_ACCESS';
  resource?: string;
  resourceId?: string;
  reason?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Record an immutable audit event for any state change, classification, override or correction
   */
  async record(params: AuditEventParams) {
    try {
      return await prisma.auditEvent.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          before: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
          after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
          requestId: params.requestId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      // In dev or test without connected DB, log to stderr without breaking flow
      console.error('[AuditService.record] Error creating audit event:', err);
      return null;
    }
  }

  /**
   * Record a security-relevant event (login failure, permission denial, scope violation)
   */
  async recordSecurityEvent(params: SecurityEventParams) {
    const actorId = params.actorId || '00000000-0000-0000-0000-000000000000';
    try {
      return await prisma.auditEvent.create({
        data: {
          actorId,
          action: AuditAction.UPDATE,
          entity: 'SECURITY_AUDIT',
          entityId: params.resourceId || params.actorEmail || 'SECURITY',
          before: {
            type: params.action,
            reason: params.reason,
            attemptedRole: params.attemptedRole,
          },
          after: {
            resource: params.resource,
            timestamp: new Date().toISOString(),
          },
          requestId: params.requestId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      console.warn('[AuditService.recordSecurityEvent] Warning:', params.action, params.reason);
      return null;
    }
  }
}

export const auditService = new AuditService();
