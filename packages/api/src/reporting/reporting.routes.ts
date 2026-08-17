import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/auth.middleware';
import { reportingService } from './reporting.service';

export const reportingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/reporting/summary
   * Returns role-specific dashboard summary cards (open, overdue, escalated, rerouted, closed)
   */
  fastify.get(
    '/reporting/summary',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const summary = await reportingService.getDashboardSummary(req.user!);
      return reply.status(200).send(summary);
    },
  );
};
