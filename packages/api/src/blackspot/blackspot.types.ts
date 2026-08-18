export type BlackspotSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BlackspotSummaryItem {
  facilityId: string;
  facilityName: string;
  facilityNameKn: string;
  district: string;
  districtKn?: string;
  facilityType: string;
  totalCases: number;
  rejectionsCount: number;
  rejectionRate: number; // 0.00 to 1.00
  capacitySignalsCount: number;
  capacitySignalsByReason: Record<string, number>;
  reroutingCount: number;
  medianAckMinutes: number | null;
  severity: BlackspotSeverity;
}

export interface BlackspotSummaryResponse {
  disclaimer: string;
  minThreshold: number;
  rollingWindowDays: number;
  totalFacilitiesTracked: number;
  suppressedFacilitiesCount: number;
  blackspots: BlackspotSummaryItem[];
}

export interface FacilitySignalsResponse {
  disclaimer: string;
  facilityId: string;
  facilityName: string;
  facilityNameKn: string;
  district: string;
  facilityType: string;
  totalSignals: number;
  signals: {
    id: string;
    caseId?: string | null;
    reasonCode: string;
    createdAt: string;
  }[];
}
