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
import { authenticate, authorizeRoles } from './auth/auth.middleware';
import { SUPERVISOR_ROLES } from './shared/constants';
import { BLACKSPOT_CONFIG } from './shared/constants';

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

      // Supervisor Dashboard Endpoint Stub (/api/v1/blackspot/summary) for RBAC enforcement
      v1.get(
        '/blackspot/summary',
        {
          preHandler: [authenticate, authorizeRoles(...SUPERVISOR_ROLES)],
        },
        async (req, reply) => {
          return reply.status(200).send({
            disclaimer: BLACKSPOT_CONFIG.PILOT_DISCLAIMER,
            blackspots: [],
          });
        },
      );
    },
    { prefix: '/api/v1' },
  );

  // Health check endpoint
  app.get('/health', async () => ({ status: 'ok', service: 'jeevasetu-api' }));

  return app;
}
