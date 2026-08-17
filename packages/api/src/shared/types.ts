import { Role, CaseStatus, GapPhase, GapCauseClass, CapacityReasonCode, DispositionCategory, FollowUpType, FollowUpOutcome, EscalationStatus } from '@prisma/client';

export {
  Role,
  CaseStatus,
  GapPhase,
  GapCauseClass,
  CapacityReasonCode,
  DispositionCategory,
  FollowUpType,
  FollowUpOutcome,
  EscalationStatus,
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  facilityId: string | null;
  district?: string | null;
  isActive: boolean;
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  facilityId: string | null;
  district?: string | null;
  iat?: number;
  exp?: number;
}

export interface ScopeContext {
  userId: string;
  role: Role;
  facilityId: string | null;
  district?: string | null;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: FieldError[];
  requestId: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
