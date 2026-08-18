import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware';
import { routingService } from './routing.service';
import { idempotencyHeaderSchema } from '../shared/validation';

const confirmRerouteSchema = z.object({
  targetFacilityId: z.string().min(1, 'targetFacilityId is required'),
  overrideReason: z.string().optional(),
});

export const routingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/referrals/:id/route-suggestions
   * Fetch ranked alternate routing suggestions for a rejected referral
   */
  fastify.get(
    '/referrals/:id/route-suggestions',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await routingService.getRouteSuggestions(id, req.user!);
      return reply.status(200).send(result);
    },
  );

  /**
   * POST /api/v1/referrals/:id/confirm-reroute
   * Confirm re-route to new destination facility, restarting acknowledgement SLA
   */
  fastify.post(
    '/referrals/:id/confirm-reroute',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = confirmRerouteSchema.parse(req.body);
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const result = await routingService.confirmReroute(
        id,
        body,
        req.user!,
        idempotencyKey,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send(result);
    },
  );
};
