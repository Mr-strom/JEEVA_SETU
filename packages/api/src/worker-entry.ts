import { startEscalationWorker } from './escalations/worker';

const intervalMs = Number(process.env.WORKER_INTERVAL_MS) || 60000;

console.log(`🚀 Starting standalone JeevaSetu Escalation Worker process (interval: ${intervalMs}ms)...`);
startEscalationWorker(intervalMs);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down Escalation Worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down Escalation Worker...');
  process.exit(0);
});
