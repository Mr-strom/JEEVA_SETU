import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SyncStatus, FrontlineReferralDraft, ClientFollowUpTask } from '../types';
import { outboxManager } from '../sync/outbox';

export const INITIAL_SYNTHETIC_DRAFTS: FrontlineReferralDraft[] = [
  {
    localId: 'draft-loc-001',
    caseId: 'JS-2026-MYS001',
    patientExternalId: 'ORS-KA-2026-7819',
    patientName: 'Lakshmi M',
    patientAge: 23,
    gravida: 2,
    parity: 1,
    riskFlags: ['SEVERE_ANAEMIA', 'PRE_ECLAMPSIA'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'Severe pallor, high blood pressure. Transferred to Cheluvamba Hospital.',
    sendingFacilityId: '22222222-2222-2222-2222-222222222203',
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
    isDraft: false,
    syncStatus: 'SYNCHRONISED',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    localId: 'draft-loc-002',
    caseId: 'JS-2026-MYS002',
    patientExternalId: 'ORS-KA-2026-9041',
    patientName: 'Savitri K',
    patientAge: 28,
    gravida: 3,
    parity: 2,
    riskFlags: ['PREVIOUS_LSCS', 'OBSTRUCTED_LABOUR'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'Second stage labour arrest. 108 ambulance en route.',
    sendingFacilityId: '22222222-2222-2222-2222-222222222203',
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
    isDraft: false,
    syncStatus: 'SYNCHRONISED',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_SYNTHETIC_FOLLOWUPS: ClientFollowUpTask[] = [
  {
    id: 'fup-loc-001',
    caseId: 'JS-2026-MYS004',
    patientExternalId: 'ORS-KA-2026-1122',
    patientName: 'Roopa N',
    contactNumber: '+919876543299',
    villageName: 'Bilikere Cross, Hunsur Taluk',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'HOME_VISIT',
    outcome: null,
    notes: 'Check blood pressure and postnatal recovery.',
    syncStatus: 'SAVED_LOCALLY',
  },
];

interface SyncContextType {
  syncStatus: SyncStatus;
  referrals: FrontlineReferralDraft[];
  followUps: ClientFollowUpTask[];
  activeConflict: { reason: string; serverState: any; nextAvailableAction: string } | null;
  dismissConflict: () => void;
  saveReferral: (
    draft: Omit<FrontlineReferralDraft, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    isDraft: boolean,
  ) => Promise<FrontlineReferralDraft>;
  completeFollowUp: (
    id: string,
    outcome: 'COMPLETED' | 'PATIENT_NOT_FOUND' | 'PATIENT_REFUSED' | 'REFERRED_ONWARD',
    notes?: string,
  ) => Promise<void>;
  triggerSync: () => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;
  isOfflineSimulated: boolean;
  setIsOfflineSimulated: (simulated: boolean) => void;
  toggleOfflineSimulation: () => void;
  pendingCount: number;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOfflineSimulated, setIsOfflineSimulatedState] = useState<boolean>(() => {
    return localStorage.getItem('jeevasetu_simulate_offline') === 'true';
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    return (localStorage.getItem('jeevasetu_sync_status') as SyncStatus) || 'SAVED_LOCALLY';
  });

  const [referrals, setReferrals] = useState<FrontlineReferralDraft[]>(() => {
    const saved = localStorage.getItem('jeevasetu_frontline_referrals');
    return saved ? JSON.parse(saved) : INITIAL_SYNTHETIC_DRAFTS;
  });

  const [followUps, setFollowUps] = useState<ClientFollowUpTask[]>(() => {
    const saved = localStorage.getItem('jeevasetu_frontline_followups');
    return saved ? JSON.parse(saved) : INITIAL_SYNTHETIC_FOLLOWUPS;
  });

  const [activeConflict, setActiveConflict] = useState<{
    reason: string;
    serverState: any;
    nextAvailableAction: string;
  } | null>(null);

  const [pendingCount, setPendingCount] = useState<number>(() => {
    return outboxManager.getPending().length;
  });

  const updatePendingCount = useCallback(() => {
    setPendingCount(outboxManager.getPending().length);
  }, []);

  useEffect(() => {
    localStorage.setItem('jeevasetu_frontline_referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('jeevasetu_frontline_followups', JSON.stringify(followUps));
  }, [followUps]);

  useEffect(() => {
    localStorage.setItem('jeevasetu_sync_status', syncStatus);
  }, [syncStatus]);

  useEffect(() => {
    localStorage.setItem('jeevasetu_simulate_offline', String(isOfflineSimulated));
  }, [isOfflineSimulated]);

  const dismissConflict = () => {
    setActiveConflict(null);
  };

  /**
   * Real end-to-end sync trigger against /api/v1/sync/batch
   */
  const triggerSync = useCallback(async () => {
    updatePendingCount();

    if (isOfflineSimulated) {
      console.log('[SyncContext] Offline simulation active — mutations held in local outbox');
      const currentPending = outboxManager.getPending();
      if (currentPending.length > 0) {
        setSyncStatus('WAITING_TO_SYNC');
      } else {
        setSyncStatus('SAVED_LOCALLY');
      }
      return;
    }

    const pending = outboxManager.getPending();
    if (pending.length === 0) {
      setSyncStatus('SYNCHRONISED');
      return;
    }

    setSyncStatus('WAITING_TO_SYNC');

    try {
      const response = await fetch('/api/v1/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer synthetic-demo-jwt-token',
        },
        body: JSON.stringify({
          mutations: pending.map((item) => ({
            mutationId: item.mutationId,
            operationType: item.operationType,
            localCaseId: item.localCaseId,
            payload: item.payload,
            clientTimestamp: item.clientTimestamp,
            idempotencyKey: item.idempotencyKey,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync HTTP error ${response.status}`);
      }

      const result = await response.json();

      // Process applied
      if (result.applied) {
        result.applied.forEach((a: any) => {
          outboxManager.markApplied(a.mutationId);
          if (a.localCaseId && a.serverCaseId) {
            setReferrals((prev) =>
              prev.map((r) =>
                r.localId === a.localCaseId
                  ? { ...r, caseId: a.result?.caseId || a.serverCaseId, syncStatus: 'SYNCHRONISED' }
                  : r,
              ),
            );
          }
        });
      }

      // Process already_applied
      if (result.alreadyApplied) {
        result.alreadyApplied.forEach((aa: any) => {
          outboxManager.markAlreadyApplied(aa.mutationId);
        });
      }

      // Process conflicts (surface to user immediately - no silent overwrite)
      if (result.conflicts && result.conflicts.length > 0) {
        const firstConflict = result.conflicts[0];
        outboxManager.markConflict(firstConflict.mutationId, firstConflict.conflict);
        setActiveConflict(firstConflict.conflict);
        setSyncStatus('SYNC_FAILED');
        updatePendingCount();
        return;
      }

      // Process rejected
      if (result.rejected && result.rejected.length > 0) {
        result.rejected.forEach((rej: any) => {
          outboxManager.markFailed(rej.mutationId, rej.error);
        });
        setSyncStatus('SYNC_FAILED');
        updatePendingCount();
        return;
      }

      setSyncStatus('SYNCHRONISED');
      updatePendingCount();
    } catch (err: any) {
      console.warn('Sync attempt failed (offline or server error)', err);
      // Mark failures with retry count in outbox
      pending.forEach((item) => {
        outboxManager.markFailed(item.mutationId, err.message || 'Network error');
      });
      setSyncStatus('SYNC_FAILED');
      updatePendingCount();
    }
  }, [isOfflineSimulated, updatePendingCount]);

  const setIsOfflineSimulated = useCallback(
    (simulated: boolean) => {
      setIsOfflineSimulatedState(simulated);
      if (!simulated) {
        // Toggled back to online -> trigger real sync drain
        setTimeout(() => {
          triggerSync().catch(() => {});
        }, 100);
      } else {
        setSyncStatus('WAITING_TO_SYNC');
      }
    },
    [triggerSync],
  );

  const toggleOfflineSimulation = useCallback(() => {
    setIsOfflineSimulated(!isOfflineSimulated);
  }, [isOfflineSimulated, setIsOfflineSimulated]);

  const saveReferral = async (
    draft: Omit<FrontlineReferralDraft, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    isDraft: boolean,
  ): Promise<FrontlineReferralDraft> => {
    const now = new Date().toISOString();
    const localId = `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const newDraft: FrontlineReferralDraft = {
      ...draft,
      localId,
      caseId: `JS-2026-F${Math.floor(100 + Math.random() * 900)}`,
      isDraft,
      syncStatus: isDraft ? 'SAVED_LOCALLY' : 'WAITING_TO_SYNC',
      createdAt: now,
      updatedAt: now,
    };

    setReferrals((prev) => [newDraft, ...prev]);

    if (!isDraft) {
      // Enqueue to persistent outbox
      outboxManager.enqueue({
        mutationId: `mut-${Date.now()}`,
        operationType: 'CREATE_REFERRAL',
        localCaseId: localId,
        payload: { ...draft, isDraft: false },
        idempotencyKey,
      });

      setSyncStatus('WAITING_TO_SYNC');
      updatePendingCount();

      // Proactively trigger sync in background (if online)
      triggerSync().catch(() => {});
    } else {
      setSyncStatus('SAVED_LOCALLY');
    }

    return newDraft;
  };

  const completeFollowUp = async (
    id: string,
    outcome: 'COMPLETED' | 'PATIENT_NOT_FOUND' | 'PATIENT_REFUSED' | 'REFERRED_ONWARD',
    notes?: string,
  ): Promise<void> => {
    const idempotencyKey = `idem-fup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    setFollowUps((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              outcome,
              notes,
              completedAt: new Date().toISOString(),
              syncStatus: 'WAITING_TO_SYNC',
            }
          : f,
      ),
    );

    // Enqueue mutation to outbox
    outboxManager.enqueue({
      mutationId: `mut-fup-${Date.now()}`,
      operationType: 'COMPLETE_FOLLOW_UP',
      payload: { taskId: id, outcome, notes },
      idempotencyKey,
    });

    setSyncStatus('WAITING_TO_SYNC');
    updatePendingCount();
    triggerSync().catch(() => {});
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        referrals,
        followUps,
        activeConflict,
        dismissConflict,
        saveReferral,
        completeFollowUp,
        triggerSync,
        setSyncStatus,
        isOfflineSimulated,
        setIsOfflineSimulated,
        toggleOfflineSimulation,
        pendingCount,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
