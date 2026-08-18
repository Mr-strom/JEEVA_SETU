import { SyncStatus } from '../types';

export interface OutboxItem {
  mutationId: string;
  operationType: 'CREATE_REFERRAL' | 'UPDATE_REFERRAL' | 'COMPLETE_FOLLOW_UP' | 'ESCALATE_FOLLOW_UP';
  localCaseId?: string;
  payload: Record<string, any>;
  clientTimestamp: string;
  retryCount: number;
  syncStatus: SyncStatus;
  idempotencyKey: string;
  error?: string | null;
  conflict?: {
    reason: string;
    serverState: any;
    nextAvailableAction: string;
  } | null;
}

export const MAX_RETRY_COUNT = 5;

export function getBackoffDelayMs(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000);
}

// Memory storage fallback for Node / non-DOM environments
const memoryStorage: Record<string, string> = {};

function getStorage() {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
    },
  };
}

export class OutboxManager {
  private storageKey = 'jeevasetu_offline_outbox';

  getOutbox(): OutboxItem[] {
    const storage = getStorage();
    const raw = storage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  saveOutbox(items: OutboxItem[]): void {
    const storage = getStorage();
    storage.setItem(this.storageKey, JSON.stringify(items));
  }

  enqueue(item: Omit<OutboxItem, 'retryCount' | 'syncStatus' | 'clientTimestamp'>): OutboxItem {
    const fullItem: OutboxItem = {
      ...item,
      clientTimestamp: new Date().toISOString(),
      retryCount: 0,
      syncStatus: 'WAITING_TO_SYNC',
      error: null,
      conflict: null,
    };
    const items = this.getOutbox();
    items.push(fullItem);
    this.saveOutbox(items);
    return fullItem;
  }

  getPending(): OutboxItem[] {
    return this.getOutbox().filter(
      (item) => item.syncStatus === 'WAITING_TO_SYNC' || (item.syncStatus === 'SYNC_FAILED' && item.retryCount < MAX_RETRY_COUNT),
    );
  }

  markApplied(mutationId: string): void {
    const items = this.getOutbox();
    const target = items.find((i) => i.mutationId === mutationId);
    if (target) {
      target.syncStatus = 'SYNCHRONISED';
      target.error = null;
      target.conflict = null;
      this.saveOutbox(items);
    }
  }

  markAlreadyApplied(mutationId: string): void {
    const items = this.getOutbox();
    const target = items.find((i) => i.mutationId === mutationId);
    if (target) {
      target.syncStatus = 'SYNCHRONISED';
      target.error = null;
      this.saveOutbox(items);
    }
  }

  markConflict(mutationId: string, conflict: { reason: string; serverState: any; nextAvailableAction: string }): void {
    const items = this.getOutbox();
    const target = items.find((i) => i.mutationId === mutationId);
    if (target) {
      target.syncStatus = 'SYNC_FAILED';
      target.conflict = conflict;
      target.error = conflict.reason;
      this.saveOutbox(items);
    }
  }

  markFailed(mutationId: string, error: string): void {
    const items = this.getOutbox();
    const target = items.find((i) => i.mutationId === mutationId);
    if (target) {
      target.retryCount += 1;
      target.syncStatus = 'SYNC_FAILED';
      target.error = error;
      this.saveOutbox(items);
    }
  }

  clearOutbox(): void {
    const storage = getStorage();
    storage.removeItem(this.storageKey);
  }
}

export const outboxManager = new OutboxManager();
