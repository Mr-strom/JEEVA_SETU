export type Role =
  | 'FRONTLINE_WORKER'
  | 'SENDING_FACILITY'
  | 'RECEIVING_FACILITY'
  | 'CLINICIAN'
  | 'DISTRICT_SUPERVISOR'
  | 'ADMINISTRATOR'
  | 'CLINICAL_ADMINISTRATOR';

export type CaseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACKNOWLEDGEMENT_PENDING'
  | 'ACCEPTED'
  | 'REDIRECTED'
  | 'REJECTED'
  | 'REDIRECT_SUGGESTED'
  | 'REROUTED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'CLINICAL_DISPOSITION_RECORDED'
  | 'DISCHARGED'
  | 'FOLLOW_UP_DUE'
  | 'FOLLOW_UP_COMPLETED'
  | 'FOLLOW_UP_ESCALATED'
  | 'CLOSED';

export type CapacityReasonCode =
  | 'NO_BED'
  | 'SERVICE_UNAVAILABLE'
  | 'NO_CLINICIAN'
  | 'TRANSPORT_UNAVAILABLE'
  | 'OTHER';

export type DispositionCategory =
  | 'ADMITTED'
  | 'TRANSFERRED_OUT'
  | 'DISCHARGED_HOME'
  | 'EXPIRED'
  | 'LAMA';

export type FollowUpType = 'HOME_VISIT' | 'PHONE_CHECK' | 'FACILITY_VISIT';

export type FollowUpOutcome =
  | 'COMPLETED'
  | 'PATIENT_NOT_FOUND'
  | 'PATIENT_REFUSED'
  | 'REFERRED_ONWARD';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  facilityId?: string | null;
  district?: string | null;
  facilityName?: string | null;
  isActive: boolean;
}

export interface PatientReference {
  id: string;
  externalId: string;
  nameHash?: string;
  age?: number | null;
  gravida?: number | null;
  parity?: number | null;
  lmp?: string | null;
  edd?: string | null;
  riskFlags: string[];
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  district: string;
  taluk?: string | null;
  phone?: string | null;
  servicesOffered: string[];
}

export interface CaseEvent {
  id: string;
  caseId: string;
  type: string;
  fromStatus?: CaseStatus | null;
  toStatus?: CaseStatus | null;
  actorId: string;
  actorRole: Role;
  facilityId?: string | null;
  payload?: any;
  createdAt: string;
}

export interface ReferralCase {
  id: string;
  caseId: string;
  patientId: string;
  patient: PatientReference;
  sendingFacilityId: string;
  sendingFacility?: Facility | null;
  receivingFacilityId?: string | null;
  receivingFacility?: Facility | null;
  status: CaseStatus;
  riskFlags: string[];
  transportNeeded: boolean;
  transportMode?: string | null;
  clinicalSummary?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string; email: string; role: Role } | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email: string; role: Role } | null;
  acknowledgementDeadline?: string | null;
  followUpDueDate?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: CaseEvent[];
  dispositions?: Array<{
    id: string;
    category: DispositionCategory;
    detail?: string | null;
    recordedAt: string;
  }>;
  followUpTasks?: FollowUpTask[];
}

export interface FollowUpTask {
  id: string;
  caseId: string;
  case?: ReferralCase;
  type: FollowUpType;
  ownerId: string;
  owner?: { id: string; name: string; phone?: string | null; role: Role };
  dueDate: string;
  outcome?: FollowUpOutcome | null;
  completedAt?: string | null;
  notes?: string | null;
  escalated: boolean;
  escalatedAt?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  role: Role;
  openCases: number;
  overdueCount: number;
  escalatedCount: number;
  reroutedCount: number;
  closedCount: number;
  totalCases: number;
  timestamp: string;
}
