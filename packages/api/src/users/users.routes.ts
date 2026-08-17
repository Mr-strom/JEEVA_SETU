import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { usersService } from './users.service';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { ADMIN_ROLES } from '../shared/constants';
import { uuidSchema, updateRoleSchema } from '../shared/validation';

const listUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  facilityId: uuidSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v ? v === 'true' : undefined)),
});

const userParamsSchema = z.object({
  id: uuidSchema,
});

export const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/users
   * Admin-only endpoint to list all users
   */
  fastify.get(
    '/users',
    {
      preHandler: [authenticate, authorizeRoles(...ADMIN_ROLES)],
    },
    async (req, reply) => {
      const query = listUsersQuerySchema.parse(req.query);
      const users = await usersService.listUsers({
        role: query.role,
        facilityId: query.facilityId,
        isActive: query.isActive,
      });

      return reply.status(200).send(users);
    },
  );

  /**
   * PATCH /api/v1/users/:id
   * Admin-only endpoint to update user details or deactivate user
   */
  fastify.patch(
    '/users/:id',
    {
      preHandler: [authenticate, authorizeRoles(...ADMIN_ROLES)],
    },
    async (req, reply) => {
      const params = userParamsSchema.parse(req.params);
      const body = updateRoleSchema.parse(req.body);

      const updated = await usersService.updateUser(
        params.id,
        body,
        req.user!.id,
        (req.headers['x-request-id'] as string) || (req.id as string),
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send(updated);
    },
  );
};
