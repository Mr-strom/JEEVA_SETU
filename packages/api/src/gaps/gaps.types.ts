import { GapPhase, GapCauseClass, CaseStatus, CapacityReasonCode } from '@prisma/client';

export interface GapEvidenceItem {
  key: string;
  description: string;
  eventId?: string;
  timestamp?: string;
  value?: any;
}

export interface GapClassificationInput {
  caseId: string;
  status: CaseStatus;
  capacityReasonCode?: CapacityReasonCode | string | null;
  rejectionEventId?: string | null;
  acknowledgementDeadline?: Date | string | null;
  hasAcknowledgementEvent?: boolean;
  notificationDelivered?: boolean;
  dispatchTimestamp?: Date | string | null;
  arrivalTimestamp?: Date | string | null;
  transportDelayThresholdMinutes?: number;
  dispositionDeadline?: Date | string | null;
  hasDispositionEvent?: boolean;
  followUpDueDate?: Date | string | null;
  followUpCompleted?: boolean;
  followUpContactConfirmed?: boolean;
  hasConflictingEvidence?: boolean;
  notes?: string;
}

export interface GapClassificationResult {
  phase: GapPhase;
  causeClass: GapCauseClass;
  evidence: GapEvidenceItem[];
  classificationLabel: string;
  confidenceScore: number;
}
