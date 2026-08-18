import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../auth/auth.middleware';
import { syncService } from './sync.service';
import {
  syncBatchRequestSchema,
  syncChangesQuerySchema,
  syncAckSchema,
} from './sync.schema';

export const syncRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /api/v1/sync/batch
   * Submit an ordered batch of offline mutations
   */
  fastify.post(
    '/sync/batch',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const body = syncBatchRequestSchema.parse(req.body);
      const requestId = (req.headers['x-request-id'] as string) || (req.id as string);

      const response = await syncService.processBatch(
        body,
        req.user!,
        requestId,
        req.ip,
        req.headers['user-agent'],
      );

      return reply.status(200).send(response);
    },
  );

  /**
   * GET /api/v1/sync/changes
   * Pull delta changes since cursor
   */
  fastify.get(
    '/sync/changes',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const query = syncChangesQuerySchema.parse(req.query);
      const response = await syncService.getChanges(query, req.user!);
      return reply.status(200).send(response);
    },
  );

  /**
   * POST /api/v1/sync/ack
   * Acknowledge sync cursor
   */
  fastify.post(
    '/sync/ack',
    {
      preHandler: [authenticate],
    },
    async (req, reply) => {
      const body = syncAckSchema.parse(req.body);
      const response = await syncService.acknowledgeSync(body, req.user!);
      return reply.status(200).send(response);
    },
  );
};
