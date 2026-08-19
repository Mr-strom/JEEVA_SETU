import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './shared/errors';
import { authRoutes } from './auth/auth.routes';
import { facilitiesRoutes } from './facilities/facilities.routes';
import { usersRoutes } from './users/users.routes';
import { referralsRoutes } from './referrals/referrals.routes';
import { dispositionsRoutes } from './dispositions/dispositions.routes';
import { followUpsRoutes } from './follow-ups/follow-ups.routes';
import { reportingRoutes } from './reporting/reporting.routes';
import { auditRoutes } from './audit/audit.routes';
import { syncRoutes } from './sync/sync.routes';
import { gapsRoutes } from './gaps/gaps.routes';
import { escalationsRoutes } from './escalations/escalation.routes';
import { playbooksRoutes } from './playbooks/playbooks.routes';
import { routingRoutes } from './routing/routing.routes';
import { blackspotRoutes } from './blackspot/blackspot.routes';
import { authenticate, authorizeRoles } from './auth/auth.middleware';
import { SUPERVISOR_ROLES } from './shared/constants';
import { BLACKSPOT_CONFIG } from './shared/constants';
import { prisma } from './shared/db';
import Redis from 'ioredis';

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    genReqId: () => uuidv4(),
    ...opts,
  });

  // Security and headers plugins
  app.register(cors, {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  });

  app.register(helmet, {
    contentSecurityPolicy: false, // Allow API clients and Swagger docs
  });

  // Request ID decorator & response header
  app.addHook('onRequest', async (req, reply) => {
    const incomingRequestId = (req.headers['x-request-id'] as string) || req.id;
    req.requestId = incomingRequestId;
    reply.header('x-request-id', incomingRequestId);
  });

  // Standard Error Handler
  app.setErrorHandler((error, req, reply) => {
    const requestId = req.requestId || (req.id as string) || uuidv4();
    const timestamp = new Date().toISOString();

    // 1. Handle Domain AppErrors
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
        requestId,
        timestamp,
      });
    }

    // 2. Handle Zod Validation Errors
    if (error instanceof ZodError) {
      const fieldErrors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        fieldErrors,
        requestId,
        timestamp,
      });
    }

    // 3. Fastify Schema Validation Error
    if (error.validation) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: error.message,
        requestId,
        timestamp,
      });
    }

    // 4. Default 500 Unhandled Error
    req.log.error(error);
    return reply.status(500).send({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      requestId,
      timestamp,
    });
  });

  // Register API v1 routes
  app.register(
    async (v1) => {
      // Auth routes (/api/v1/me, /api/v1/auth/token)
      v1.register(authRoutes);

      // Facilities routes (/api/v1/facilities)
      v1.register(facilitiesRoutes);

      // Users routes (/api/v1/users, /api/v1/users/:id)
      v1.register(usersRoutes);

      // Referrals routes (/api/v1/referrals, /api/v1/referrals/:id, /api/v1/referrals/:id/events, /api/v1/referrals/:id/timeline)
      v1.register(referralsRoutes);

      // Dispositions & Discharge routes (/api/v1/referrals/:id/disposition, /api/v1/referrals/:id/discharge, /api/v1/referrals/:id/close)
      v1.register(dispositionsRoutes);

      // Follow-ups routes (/api/v1/follow-ups, /api/v1/follow-ups/:id/complete, /api/v1/follow-ups/:id/escalate)
      v1.register(followUpsRoutes);

      // Reporting routes (/api/v1/reporting/summary)
      v1.register(reportingRoutes);

      // Audit routes (/api/v1/audit/cases/:caseId, /api/v1/audit/events - Read-only)
      v1.register(auditRoutes);

      // Offline Sync routes (/api/v1/sync/batch, /api/v1/sync/changes, /api/v1/sync/ack)
      v1.register(syncRoutes);

      // GapSense routes (/api/v1/referrals/:id/gap/override, /api/v1/gaps/:id/override, /api/v1/referrals/:id/gaps)
      v1.register(gapsRoutes);

      // Escalation routes (/api/v1/escalations/scan, /api/v1/escalations, /api/v1/escalations/:id)
      v1.register(escalationsRoutes);

      // Playbooks routes (/api/v1/playbooks, /api/v1/playbooks/:id)
      v1.register(playbooksRoutes);

      // Routing suggestion & confirm-reroute routes (/api/v1/referrals/:id/route-suggestions, /api/v1/referrals/:id/confirm-reroute)
      v1.register(routingRoutes);

      // Blackspot routes (/api/v1/blackspot/summary, /api/v1/blackspot/facilities/:id/signals - Read-only)
      v1.register(blackspotRoutes);
    },
    { prefix: '/api/v1' },
  );

  // Health check endpoint (Liveness Probe + DB connectivity)
  app.get('/health', async (_req, reply) => {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    if (process.env.TEST_DEGRADED === 'true') {
      dbStatus = 'disconnected';
    } else {
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch {
        dbStatus = 'disconnected';
      }
    }

    const isHealthy = dbStatus === 'connected' || (process.env.NODE_ENV === 'test' && process.env.TEST_DEGRADED !== 'true');
    const responseStatus = dbStatus === 'connected' ? 'ok' : (isHealthy ? 'ok' : 'degraded');
    return reply.status(isHealthy ? 200 : 503).send({
      status: responseStatus,
      service: 'jeevasetu-api',
      version: '2.0.0',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check endpoint (Readiness Probe: DB + Redis ping if configured)
  app.get('/ready', async (_req, reply) => {
    let dbStatus: 'connected' | 'error' = 'error';
    let redisStatus: 'connected' | 'not_configured' | 'error' = 'not_configured';

    if (process.env.TEST_DEGRADED === 'true') {
      dbStatus = 'error';
      redisStatus = 'error';
    } else {
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch {
        dbStatus = 'error';
      }

      if (process.env.REDIS_URL) {
        try {
          const redisClient = new Redis(process.env.REDIS_URL, {
            connectTimeout: 1000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
          });
          await redisClient.connect();
          const pong = await redisClient.ping();
          await redisClient.quit();
          redisStatus = pong === 'PONG' ? 'connected' : 'error';
        } catch {
          redisStatus = 'error';
        }
      }
    }

    const isReady = (dbStatus === 'connected' && (redisStatus === 'connected' || redisStatus === 'not_configured')) || (process.env.NODE_ENV === 'test' && process.env.TEST_DEGRADED !== 'true');
    return reply.status(isReady ? 200 : 503).send({
      status: isReady && dbStatus === 'connected' ? 'ready' : (isReady ? 'ready' : 'not_ready'),
      service: 'jeevasetu-api',
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
