import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware';
import { dispositionsService } from './dispositions.service';
import {
  recordDispositionSchema,
  recordDischargeSchema,
  closeReferralSchema,
} from './dispositions.schema';

const referralParamsSchema = z.object({
  id: z.string().min(1, 'Referral ID is required'),
});

export const dispositionsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/referrals/:id/disposition
   * Clinician-only recording of approved clinical disposition category
   */
  fastify.post(
    '/referrals/:id/disposition',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = recordDispositionSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await dispositionsService.recordDisposition(
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
   * POST /api/v1/referrals/:id/discharge
   * Discharge patient and create post-discharge follow-up task
   */
  fastify.post(
    '/referrals/:id/discharge',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = recordDischargeSchema.parse(req.body || {});
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await dispositionsService.recordDischarge(
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
   * POST /api/v1/referrals/:id/close
   * Close the referral case (rejects if mandatory follow-up is unresolved)
   */
  fastify.post(
    '/referrals/:id/close',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = closeReferralSchema.parse(req.body || {});
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await dispositionsService.closeReferral(
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
