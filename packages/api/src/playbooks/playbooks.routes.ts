import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { GapPhase, GapCauseClass, Role } from '@prisma/client';
import { authenticate, authorizeRoles } from '../auth/auth.middleware';
import { playbooksService } from './playbooks.service';
import { createPlaybookSchema, updatePlaybookSchema } from './playbooks.schema';

const PLAYBOOK_ADMIN_ROLES = [Role.CLINICAL_ADMINISTRATOR, Role.ADMINISTRATOR];

export const playbooksRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/v1/playbooks
   * List playbooks
   */
  fastify.get(
    '/playbooks',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = req.query as { phase?: GapPhase; cause?: GapCauseClass; activeOnly?: string };
      const playbooks = await playbooksService.listPlaybooks({
        phase: query.phase,
        cause: query.cause,
        activeOnly: query.activeOnly !== 'false',
      });
      return reply.status(200).send({ playbooks });
    },
  );

  /**
   * GET /api/v1/playbooks/:id
   * Get playbook by ID
   */
  fastify.get(
    '/playbooks/:id',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const playbook = await playbooksService.getPlaybookById(id);
      return reply.status(200).send({ playbook });
    },
  );

  /**
   * POST /api/v1/playbooks
   * Create new action playbook (Clinical Administrator & Admin only)
   */
  fastify.post(
    '/playbooks',
    {
      preHandler: [authenticate, authorizeRoles(...PLAYBOOK_ADMIN_ROLES)],
    },
    async (req, reply) => {
      const body = createPlaybookSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const playbook = await playbooksService.createPlaybook(
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(201).send({
        success: true,
        playbook,
      });
    },
  );

  /**
   * PUT /api/v1/playbooks/:id
   * Update action playbook (Clinical Administrator & Admin only)
   */
  fastify.put(
    '/playbooks/:id',
    {
      preHandler: [authenticate, authorizeRoles(...PLAYBOOK_ADMIN_ROLES)],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = updatePlaybookSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const playbook = await playbooksService.updatePlaybook(
        id,
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send({
        success: true,
        playbook,
      });
    },
  );
};
