import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { SUPERVISOR_ROLES } from '../shared/constants';
import { prisma } from '../shared/db';
import { paginationSchema } from '../shared/validation';

const caseAuditParamsSchema = z.object({
  caseId: z.string().min(1),
});

export const auditRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/audit/cases/:caseId
   * Query immutable audit trail for a referral case (Read-only)
   */
  fastify.get(
    '/audit/cases/:caseId',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = caseAuditParamsSchema.parse(req.params);

      const events = await prisma.auditEvent.findMany({
        where: {
          OR: [
            { entityId: params.caseId },
            { entity: 'ReferralCase', entityId: params.caseId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        include: {
          actor: {
            select: { id: true, name: true, role: true, email: true },
          },
        },
      });

      return reply.status(200).send(events);
    },
  );

  /**
   * GET /api/v1/audit/events
   * System-wide audit event query for supervisors & administrators (Read-only)
   */
  fastify.get(
    '/audit/events',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const query = paginationSchema.parse(req.query);
      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.auditEvent.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
        }),
        prisma.auditEvent.count(),
      ]);

      return reply.status(200).send({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    },
  );
};
