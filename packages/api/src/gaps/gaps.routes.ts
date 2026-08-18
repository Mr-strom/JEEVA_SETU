import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { GapPhase, GapCauseClass } from '@prisma/client';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { SUPERVISOR_ROLES } from '../shared/constants';
import { gapsService } from './gaps.service';
import { prisma } from '../shared/db';

const gapOverrideSchema = z.object({
  overridePhase: z.nativeEnum(GapPhase),
  overrideCauseClass: z.nativeEnum(GapCauseClass),
  overrideReason: z.string().min(5, 'Override reason must be at least 5 characters'),
});

export const gapsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/referrals/:id/gap/override
   * Supervisor override for the most recent GapEvent on a referral case
   */
  fastify.post(
    '/referrals/:id/gap/override',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = gapOverrideSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      // Find the referral case and its latest gap event
      const targetCase = await prisma.referralCase.findFirst({
        where: { OR: [{ id }, { caseId: id }] },
        include: {
          gapEvents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!targetCase) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: `Referral case '${id}' not found`,
        });
      }

      if (targetCase.gapEvents.length === 0) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: `No GapEvent exists on referral case '${id}' to override`,
        });
      }

      const latestGap = targetCase.gapEvents[0];
      const updated = await gapsService.overrideGap(
        latestGap.id,
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send({
        success: true,
        message: 'Gap classification overridden by supervisor. Audit event logged.',
        gapEvent: updated,
      });
    },
  );

  /**
   * POST /api/v1/gaps/:id/override
   * Direct GapEvent override by gap ID
   */
  fastify.post(
    '/gaps/:id/override',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = gapOverrideSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const updated = await gapsService.overrideGap(
        id,
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send({
        success: true,
        message: 'Gap classification overridden by supervisor. Audit event logged.',
        gapEvent: updated,
      });
    },
  );

  /**
   * GET /api/v1/referrals/:id/gaps
   * Read-only gap history for a referral case
   */
  fastify.get(
    '/referrals/:id/gaps',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const targetCase = await prisma.referralCase.findFirst({
        where: { OR: [{ id }, { caseId: id }] },
      });

      if (!targetCase) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: `Referral case '${id}' not found`,
        });
      }

      const gaps = await gapsService.getGapsForCase(targetCase.id);
      return reply.status(200).send({
        caseId: targetCase.caseId,
        gaps,
      });
    },
  );
};
