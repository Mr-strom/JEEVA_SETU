import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate, enforceSenderFieldProtection } from '../auth/auth.middleware';
import { referralsService } from './referrals.service';
import {
  createReferralSchema,
  updateReferralSchema,
  listReferralsQuerySchema,
  addCaseEventSchema,
  acceptReferralSchema,
  redirectReferralSchema,
  rejectReferralSchema,
  recordArrivalSchema,
} from './referrals.schema';

const referralParamsSchema = z.object({
  id: z.string().min(1, 'Referral ID is required'),
});

export const referralsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/referrals
   * Create or draft a new maternal referral case (idempotent)
   */
  fastify.post(
    '/referrals',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const body = createReferralSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const referral = await referralsService.createReferral(
        body,
        req.user!,
        idempotencyKey,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(201).send(referral);
    },
  );

  /**
   * GET /api/v1/referrals
   * List referrals scoped to user role and facility/district
   */
  fastify.get(
    '/referrals',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = listReferralsQuerySchema.parse(req.query);
      const result = await referralsService.listReferrals(query, req.user!);
      return reply.status(200).send(result);
    },
  );

  /**
   * GET /api/v1/referrals/:id
   * Get single referral case by ID or caseId with scope enforcement
   */
  fastify.get(
    '/referrals/:id',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const referral = await referralsService.getReferralById(params.id, req.user!);
      return reply.status(200).send(referral);
    },
  );

  /**
   * PATCH /api/v1/referrals/:id
   * Update permitted operational fields on a referral
   */
  fastify.patch(
    '/referrals/:id',
    {
      preHandler: [authenticate, enforceSenderFieldProtection(['riskFlags', 'clinicalSummary'])],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = updateReferralSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await referralsService.updateReferral(
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
   * POST /api/v1/referrals/:id/accept
   * Receiving facility accepts the referral
   */
  fastify.post(
    '/referrals/:id/accept',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = acceptReferralSchema.parse(req.body || {});
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await referralsService.acceptReferral(
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
   * POST /api/v1/referrals/:id/redirect
   * Receiving facility redirects the referral to another facility (requires capacity reason code)
   */
  fastify.post(
    '/referrals/:id/redirect',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = redirectReferralSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await referralsService.redirectReferral(
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
   * POST /api/v1/referrals/:id/reject
   * Receiving facility rejects the referral (requires capacity reason code)
   */
  fastify.post(
    '/referrals/:id/reject',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = rejectReferralSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await referralsService.rejectReferral(
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
   * POST /api/v1/referrals/:id/arrival
   * Record patient arrival at the receiving facility
   */
  fastify.post(
    '/referrals/:id/arrival',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = recordArrivalSchema.parse(req.body || {});
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await referralsService.recordArrival(
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
   * POST /api/v1/referrals/:id/events
   * Append a custom operational CaseEvent to the referral history
   */
  fastify.post(
    '/referrals/:id/events',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const body = addCaseEventSchema.parse(req.body);
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const event = await referralsService.addCaseEvent(
        params.id,
        body,
        req.user!,
        idempotencyKey,
        requestId,
      );

      return reply.status(201).send(event);
    },
  );

  /**
   * GET /api/v1/referrals/:id/timeline
   * Get chronological event history for a referral
   */
  fastify.get(
    '/referrals/:id/timeline',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const params = referralParamsSchema.parse(req.params);
      const timeline = await referralsService.getTimeline(params.id, req.user!);
      return reply.status(200).send(timeline);
    },
  );
};
