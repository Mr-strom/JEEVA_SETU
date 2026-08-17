import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth.middleware';
import { authService } from './auth.service';
import { prisma } from '../shared/db';
import { NotFoundError } from '../shared/errors';

const tokenRequestSchema = z.object({
  email: z.string().email(),
});

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/me
   * Returns current authenticated user details and assigned facility
   */
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const user = req.user!;
      let facility = null;

      if (user.facilityId) {
        facility = await prisma.facility.findUnique({
          where: { id: user.facilityId },
          select: {
            id: true,
            name: true,
            nameKn: true,
            district: true,
            districtKn: true,
            type: true,
            specialties: true,
            capacityBeds: true,
            isActive: true,
          },
        });
      }

      return reply.status(200).send({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        facilityId: user.facilityId,
        district: user.district,
        isActive: user.isActive,
        facility,
      });
    },
  );

  /**
   * POST /api/v1/auth/token
   * Development & test helper endpoint to generate JWT for seeded users
   */
  fastify.post('/auth/token', async (req, reply) => {
    const parsed = tokenRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email payload',
        requestId: (req.headers['x-request-id'] as string) || (req.id as string),
        timestamp: new Date().toISOString(),
      });
    }

    const { email } = parsed.data;
    const result = await authService.authenticateByEmail(
      email,
      req.ip,
      (req.headers['x-request-id'] as string) || (req.id as string),
    );

    return reply.status(200).send(result);
  });
};
