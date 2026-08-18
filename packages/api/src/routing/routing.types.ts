import { CapacityReasonCode } from '@prisma/client';

export interface FacilityCandidate {
  id: string;
  name: string;
  nameKn: string;
  district: string;
  districtKn?: string;
  type: string;
  specialties: string[];
  capacityBeds?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
}

export interface RoutingRequest {
  caseId: string;
  sendingFacilityId: string;
  rejectingFacilityId: string;
  district: string;
  riskFlags: string[];
  capacityReasonCode?: CapacityReasonCode | string | null;
  candidateFacilities: FacilityCandidate[];
}

export interface RoutingSuggestionResult {
  suggestedFacilityId: string;
  suggestedFacility: FacilityCandidate;
  rank: number;
  score: number;
  reasons: string[];
  distanceKm?: number;
}
