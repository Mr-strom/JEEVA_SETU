import { describe, it, expect, beforeEach } from 'vitest';
import { outboxManager, getBackoffDelayMs, MAX_RETRY_COUNT } from '../sync/outbox';

describe('Phase 7: Client Outbox Persistence & Recovery', () => {
  beforeEach(() => {
    outboxManager.clearOutbox();
  });

  it('calculates exponential backoff delay correctly up to max 30s', () => {
    expect(getBackoffDelayMs(0)).toBe(1000);
    expect(getBackoffDelayMs(1)).toBe(2000);
    expect(getBackoffDelayMs(2)).toBe(4000);
    expect(getBackoffDelayMs(3)).toBe(8000);
    expect(getBackoffDelayMs(4)).toBe(16000);
    expect(getBackoffDelayMs(5)).toBe(30000); // capped at 30000
    expect(MAX_RETRY_COUNT).toBe(5);
  });

  it('enqueues mutations into persistent storage', () => {
    const item = outboxManager.enqueue({
      mutationId: 'mut-101',
      operationType: 'CREATE_REFERRAL',
      localCaseId: 'loc-101',
      payload: { patientExternalId: 'ORS-001' },
      idempotencyKey: 'idem-101',
    });

    expect(item.mutationId).toBe('mut-101');
    expect(item.syncStatus).toBe('WAITING_TO_SYNC');
    expect(item.retryCount).toBe(0);

    const pending = outboxManager.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].mutationId).toBe('mut-101');
  });

  it('recovers pending outbox mutations cleanly after app restart / storage reload', () => {
    // 1. Worker creates two referrals offline
    outboxManager.enqueue({
      mutationId: 'mut-restart-1',
      operationType: 'CREATE_REFERRAL',
      localCaseId: 'loc-1',
      payload: { patientExternalId: 'ORS-101' },
      idempotencyKey: 'idem-1',
    });

    outboxManager.enqueue({
      mutationId: 'mut-restart-2',
      operationType: 'COMPLETE_FOLLOW_UP',
      payload: { taskId: 'task-1', outcome: 'COMPLETED' },
      idempotencyKey: 'idem-2',
    });

    // 2. Simulate app kill and reload by instantiating new OutboxManager instance
    const freshOutboxManager = new (outboxManager.constructor as any)();
    const recovered = freshOutboxManager.getPending();

    expect(recovered.length).toBe(2);
    expect(recovered[0].mutationId).toBe('mut-restart-1');
    expect(recovered[1].mutationId).toBe('mut-restart-2');
    expect(recovered[0].idempotencyKey).toBe('idem-1');
  });

  it('marks conflict with server state and reason without silent resolution', () => {
    const item = outboxManager.enqueue({
      mutationId: 'mut-conf-01',
      operationType: 'UPDATE_REFERRAL',
      payload: { caseId: 'case-99' },
      idempotencyKey: 'idem-conf',
    });

    outboxManager.markConflict(item.mutationId, {
      reason: 'Case is already closed',
      serverState: { status: 'CLOSED' },
      nextAvailableAction: 'REFRESH_CASE_STATE',
    });

    const outbox = outboxManager.getOutbox();
    const updated = outbox.find((i) => i.mutationId === item.mutationId);
    expect(updated?.syncStatus).toBe('SYNC_FAILED');
    expect(updated?.conflict).toBeDefined();
    expect(updated?.conflict?.reason).toBe('Case is already closed');
  });
});
