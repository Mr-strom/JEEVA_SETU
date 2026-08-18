import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { EscalationStatus } from '@prisma/client';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { SUPERVISOR_ROLES } from '../shared/constants';
import { escalationsService } from './escalation.service';

const recordStepSchema = z.object({
  stepId: z.string().min(1, 'stepId is required'),
  notes: z.string().optional(),
  evidence: z.any().optional(),
});

const resolveEscalationSchema = z.object({
  resolutionSummary: z.string().min(5, 'Resolution summary must be at least 5 characters'),
});

export const escalationsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/escalations/scan
   * Trigger on-demand escalation scanning for overdue cases (Supervisor & Admin)
   */
  fastify.post(
    '/escalations/scan',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (_req, reply) => {
      const stats = await escalationsService.runScanner();
      return reply.status(200).send({
        success: true,
        stats,
      });
    },
  );

  /**
   * GET /api/v1/escalations
   * List escalations filtered by status and role scope
   */
  fastify.get(
    '/escalations',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = req.query as { status?: EscalationStatus; limit?: string };
      const escalations = await escalationsService.getEscalations(
        {
          status: query.status,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
        },
        req.user!,
      );
      return reply.status(200).send({ escalations });
    },
  );

  /**
   * GET /api/v1/escalations/:id
   * Get escalation detail (includes GapEvent, Playbook, and steps)
   */
  fastify.get(
    '/escalations/:id',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const escalation = await escalationsService.getEscalationById(id, req.user!);
      return reply.status(200).send({ escalation });
    },
  );

  /**
   * POST /api/v1/escalations/:id/acknowledge
   * Supervisor acknowledges and takes ownership of the escalation
   */
  fastify.post(
    '/escalations/:id/acknowledge',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const escalation = await escalationsService.acknowledgeEscalation(
        id,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send({
        success: true,
        message: 'Escalation acknowledged by supervisor.',
        escalation,
      });
    },
  );

  /**
   * POST /api/v1/escalations/:id/playbook-step
   * Record human completion of a playbook step
   */
  fastify.post(
    '/escalations/:id/playbook-step',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = recordStepSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const step = await escalationsService.recordPlaybookStep(
        id,
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send({
        success: true,
        message: 'Playbook step recorded.',
        step,
      });
    },
  );

  /**
   * POST /api/v1/escalations/:id/resolve
   * Supervisor resolves the escalation with summary
   */
  fastify.post(
    '/escalations/:id/resolve',
    {
      preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = resolveEscalationSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const escalation = await escalationsService.resolveEscalation(
        id,
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send({
        success: true,
        message: 'Escalation resolved.',
        escalation,
      });
    },
  );
};
