import { escalationScanner } from './escalation-scanner';
import { EscalationScanResult } from './escalation.types';

let isRunning = false;
let timerId: NodeJS.Timeout | null = null;

export async function runEscalationScan(): Promise<EscalationScanResult> {
  const result = await escalationScanner.scan();
  console.log(
    `[EscalationWorker] Scan finished: scanned=${result.scanned}, created=${result.created}, notified=${result.notified}, failed=${result.failed}, duration=${result.durationMs}ms`,
  );
  return result;
}

export function startEscalationWorker(intervalMs: number = 60000): void {
  if (isRunning) {
    return;
  }
  isRunning = true;
  console.log(`[EscalationWorker] Started background worker loop (interval: ${intervalMs}ms)`);

  const loop = async () => {
    try {
      await runEscalationScan();
    } catch (err) {
      console.error('[EscalationWorker] Error during background scan', err);
    } finally {
      if (isRunning) {
        timerId = setTimeout(loop, intervalMs);
      }
    }
  };

  loop();
}

export function stopEscalationWorker(): void {
  isRunning = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  console.log('[EscalationWorker] Stopped background worker loop');
}
