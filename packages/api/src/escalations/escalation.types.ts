import { EscalationStatus, GapPhase, GapCauseClass } from '@prisma/client';

export interface EscalationScanResult {
  scanned: number;
  created: number;
  notified: number;
  failed: number;
  durationMs: number;
  timestamp: string;
}

export interface EscalationSummaryItem {
  id: string;
  caseId: string;
  caseRef: string;
  patientExternalId: string;
  phase: GapPhase;
  causeClass: GapCauseClass;
  status: EscalationStatus;
  playbookName: string;
  startedAt: string;
  assigneeName?: string | null;
}
