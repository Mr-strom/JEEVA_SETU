import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { facilitiesService } from './facilities.service';
import { authenticate } from '../auth/auth.middleware';

const listFacilitiesQuerySchema = z.object({
  district: z.string().optional(),
  type: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v ? v === 'true' : undefined)),
});

export const facilitiesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/facilities
   * Returns list of facilities filtered by district/type
   */
  fastify.get(
    '/facilities',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = listFacilitiesQuerySchema.parse(req.query);
      const facilities = await facilitiesService.listFacilities({
        district: query.district,
        type: query.type,
        isActive: query.isActive,
      });

      return reply.status(200).send(facilities);
    },
  );
};
