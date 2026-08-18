import React, { createContext, useContext, useState, useEffect } from 'react';
import { SyncStatus, FrontlineReferralDraft, ClientFollowUpTask } from '../types';

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
  saveReferral: (draft: Omit<FrontlineReferralDraft, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>, isDraft: boolean) => Promise<FrontlineReferralDraft>;
  completeFollowUp: (id: string, outcome: 'COMPLETED' | 'PATIENT_NOT_FOUND' | 'PATIENT_REFUSED' | 'REFERRED_ONWARD', notes?: string) => Promise<void>;
  triggerSync: () => void;
  setSyncStatus: (status: SyncStatus) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    localStorage.setItem('jeevasetu_frontline_referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('jeevasetu_frontline_followups', JSON.stringify(followUps));
  }, [followUps]);

  useEffect(() => {
    localStorage.setItem('jeevasetu_sync_status', syncStatus);
  }, [syncStatus]);

  const saveReferral = async (
    draft: Omit<FrontlineReferralDraft, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    isDraft: boolean,
  ): Promise<FrontlineReferralDraft> => {
    const now = new Date().toISOString();
    const newDraft: FrontlineReferralDraft = {
      ...draft,
      localId: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseId: `JS-2026-F${Math.floor(100 + Math.random() * 900)}`,
      isDraft,
      syncStatus: isDraft ? 'SAVED_LOCALLY' : 'WAITING_TO_SYNC',
      createdAt: now,
      updatedAt: now,
    };

    setReferrals((prev) => [newDraft, ...prev]);
    setSyncStatus(isDraft ? 'SAVED_LOCALLY' : 'WAITING_TO_SYNC');
    return newDraft;
  };

  const completeFollowUp = async (
    id: string,
    outcome: 'COMPLETED' | 'PATIENT_NOT_FOUND' | 'PATIENT_REFUSED' | 'REFERRED_ONWARD',
    notes?: string,
  ): Promise<void> => {
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
    setSyncStatus('WAITING_TO_SYNC');
  };

  // Stub sync trigger (cycles states for demo & testing verification)
  const triggerSync = () => {
    if (syncStatus === 'WAITING_TO_SYNC' || syncStatus === 'SAVED_LOCALLY') {
      setSyncStatus('SYNCHRONISED');
    } else if (syncStatus === 'SYNCHRONISED') {
      setSyncStatus('SYNC_FAILED');
    } else {
      setSyncStatus('SAVED_LOCALLY');
    }
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        referrals,
        followUps,
        saveReferral,
        completeFollowUp,
        triggerSync,
        setSyncStatus,
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
