import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { SUPERVISOR_ROLES } from '../shared/constants';
import { blackspotService } from './blackspot.service';

export const blackspotRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/blackspot/summary
   * Returns aggregated facility capacity indicators and blackspots
   */
  fastify.get(
    '/blackspot/summary',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const query = req.query as { district?: string; rollingDays?: string; minThreshold?: string };
      const summary = await blackspotService.getBlackspotSummary(
        {
          district: query.district,
          rollingDays: query.rollingDays ? parseInt(query.rollingDays, 10) : undefined,
          minThreshold: query.minThreshold ? parseInt(query.minThreshold, 10) : undefined,
        },
        req.user!,
      );

      return reply.status(200).send(summary);
    },
  );

  /**
   * GET /api/v1/blackspot/facilities/:id/signals
   * Returns non-identifying capacity signals for a specific facility
   */
  fastify.get(
    '/blackspot/facilities/:id/signals',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const query = req.query as { rollingDays?: string };

      const result = await blackspotService.getFacilitySignals(
        id,
        {
          rollingDays: query.rollingDays ? parseInt(query.rollingDays, 10) : undefined,
        },
        req.user!,
      );

      return reply.status(200).send(result);
    },
  );
};
