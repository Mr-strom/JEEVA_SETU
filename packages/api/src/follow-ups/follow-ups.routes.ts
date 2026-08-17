import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware';
import { followUpsService } from './follow-ups.service';
import {
  listFollowUpsQuerySchema,
  completeFollowUpSchema,
  escalateFollowUpSchema,
} from './follow-ups.schema';

const taskParamsSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
});

export const followUpsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/follow-ups
   * List follow-up tasks scoped to user role
   */
  fastify.get(
    '/follow-ups',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = listFollowUpsQuerySchema.parse(req.query);
      const result = await followUpsService.listFollowUps(query, req.user!);
      return reply.status(200).send(result);
    },
  );

  /**
   * POST /api/v1/follow-ups/:id/complete
   * Complete follow-up task
   */
  fastify.post(
    '/follow-ups/:id/complete',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = taskParamsSchema.parse(req.params);
      const body = completeFollowUpSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await followUpsService.completeFollowUp(
        params.id,
        body,
        req.user!,
        idempotencyKey,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send(updated);
    },
  );

  /**
   * POST /api/v1/follow-ups/:id/escalate
   * Escalate overdue or uncontactable follow-up
   */
  fastify.post(
    '/follow-ups/:id/escalate',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = taskParamsSchema.parse(req.params);
      const body = escalateFollowUpSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await followUpsService.escalateFollowUp(
        params.id,
        body,
        req.user!,
        idempotencyKey,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send(updated);
    },
  );
};
