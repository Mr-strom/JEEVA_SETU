import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { EscalationStatus } from '@prisma/client';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { SUPERVISOR_ROLES } from '../shared/constants';
import { escalationsService } from './escalation.service';

export const escalationsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/escalations/scan
   * Trigger on-demand escalation scanning for overdue cases (Supervisor & Admin)
   */
  fastify.post(
    '/escalations/scan',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (_req, reply) => {
      const stats = await escalationsService.runScanner();
      return reply.status(200).send({
        success: true,
        stats,
      });
    },
  );

  /**
   * GET /api/v1/escalations
   * List escalations filtered by status and role scope
   */
  fastify.get(
    '/escalations',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = req.query as { status?: EscalationStatus; limit?: string };
      const escalations = await escalationsService.getEscalations(
        {
          status: query.status,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
        },
        req.user!,
      );
      return reply.status(200).send({ escalations });
    },
  );

  /**
   * GET /api/v1/escalations/:id
   * Get escalation detail
   */
  fastify.get(
    '/escalations/:id',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const escalation = await escalationsService.getEscalationById(id, req.user!);
      return reply.status(200).send({ escalation });
    },
  );
};
