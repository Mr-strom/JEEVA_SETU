export type SyncStatus = 'SAVED_LOCALLY' | 'WAITING_TO_SYNC' | 'SYNCHRONISED' | 'SYNC_FAILED';

export interface FrontlineReferralDraft {
  localId: string;
  caseId?: string;
  patientExternalId: string;
  patientName?: string;
  patientAge?: number | null;
  gravida?: number | null;
  parity?: number | null;
  lmp?: string;
  edd?: string;
  riskFlags: string[]; // requires clinical approval
  transportNeeded: boolean;
  transportMode?: string;
  clinicalSummary?: string;
  sendingFacilityId: string;
  receivingFacilityId?: string;
  isDraft: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFollowUpTask {
  id: string;
  caseId: string;
  patientExternalId: string;
  patientName?: string;
  contactNumber?: string;
  villageName?: string;
  dueDate: string;
  type: 'HOME_VISIT' | 'PHONE_CHECK' | 'FACILITY_VISIT';
  outcome?: 'COMPLETED' | 'PATIENT_NOT_FOUND' | 'PATIENT_REFUSED' | 'REFERRED_ONWARD' | null;
  notes?: string;
  completedAt?: string | null;
  syncStatus: SyncStatus;
}
