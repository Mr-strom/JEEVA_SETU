import { buildApp } from './app';
import { startEscalationWorker } from './escalations/worker';

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

const app = buildApp({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
});

async function start() {
  try {
    await app.listen({ port, host });
    console.log(`🚀 JeevaSetu API server listening on http://${host}:${port}`);

    // Start background escalation worker if explicitly enabled
    if (process.env.WORKER_ENABLED === 'true') {
      const intervalMs = Number(process.env.WORKER_INTERVAL_MS) || 60000;
      startEscalationWorker(intervalMs);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { app };
