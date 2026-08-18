import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';

describe('Phase 11 B1: Deployment Health & Readiness Probes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with service metadata and database status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('jeevasetu-api');
    expect(body.version).toBe('2.0.0');
    expect(body.database).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('GET /ready returns 200 with database and redis dependency checks', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ready');
    expect(body.service).toBe('jeevasetu-api');
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.redis).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });
});
