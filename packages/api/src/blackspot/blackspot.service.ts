import { Role, CapacityReasonCode } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { BLACKSPOT_CONFIG } from '../shared/constants';
import {
  BlackspotSummaryItem,
  BlackspotSummaryResponse,
  BlackspotSeverity,
  FacilitySignalsResponse,
} from './blackspot.types';

export class BlackspotService {
  /**
   * GET /api/v1/blackspot/summary
   * Read-only aggregation over CapacitySignal, CaseEvent, and ReferralCase.
   * Safety rules enforced:
   * - ZERO patient joins or identifying fields
   * - Suppresses any facility with totalCases < MIN_CASE_COUNT_THRESHOLD
   * - Scoped by district for District Supervisors
   */
  async getBlackspotSummary(
    query: { district?: string; rollingDays?: number; minThreshold?: number },
    user: AuthUser,
  ): Promise<BlackspotSummaryResponse> {
    const rollingDays = query.rollingDays ? Math.max(1, query.rollingDays) : 30;
    const minThreshold = query.minThreshold !== undefined
      ? Math.max(1, query.minThreshold)
      : BLACKSPOT_CONFIG.MIN_CASE_COUNT_THRESHOLD;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rollingDays);

    // Facility filter based on role and query
    const facilityWhere: Record<string, any> = { isActive: true };

    if (user.role === Role.DISTRICT_SUPERVISOR && user.district) {
      facilityWhere.district = user.district;
    } else if (query.district) {
      facilityWhere.district = query.district;
    }

    // Query active facilities (NO patient joins!)
    const facilities = await prisma.facility.findMany({
      where: facilityWhere,
      orderBy: { name: 'asc' },
    });

    const blackspots: BlackspotSummaryItem[] = [];
    let suppressedFacilitiesCount = 0;

    for (const facility of facilities) {
      // Aggregate cases where this facility was the receiving destination
      const cases = await prisma.referralCase.findMany({
        where: {
          receivingFacilityId: facility.id,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          events: {
            where: {
              type: { in: ['SUBMITTED', 'ACCEPTED', 'REDIRECTED', 'REJECTED', 'REROUTED'] },
            },
            select: {
              type: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const totalCases = cases.length;

      // HARD SAFETY RULE: Suppress facility if case count is below minimum threshold
      if (totalCases < minThreshold) {
        suppressedFacilitiesCount++;
        continue;
      }

      // Fetch capacity signals for this facility in rolling window
      const capacitySignals = await prisma.capacitySignal.findMany({
        where: {
          facilityId: facility.id,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          reasonCode: true,
          createdAt: true,
        },
      });

      // Count rejections & capacity signals breakdown
      let rejectionsCount = 0;
      const capacitySignalsByReason: Record<string, number> = {
        [CapacityReasonCode.NO_BED]: 0,
        [CapacityReasonCode.SERVICE_UNAVAILABLE]: 0,
        [CapacityReasonCode.NO_CLINICIAN]: 0,
        [CapacityReasonCode.TRANSPORT_UNAVAILABLE]: 0,
        [CapacityReasonCode.OTHER]: 0,
      };

      capacitySignals.forEach((sig) => {
        if (capacitySignalsByReason[sig.reasonCode] !== undefined) {
          capacitySignalsByReason[sig.reasonCode]++;
        }
      });

      let reroutingCount = 0;
      const ackDurationsMinutes: number[] = [];

      cases.forEach((c) => {
        if (c.status === 'REJECTED') {
          rejectionsCount++;
        }

        const submitEv = c.events.find((e) => e.type === 'SUBMITTED');
        const ackEv = c.events.find((e) => ['ACCEPTED', 'REDIRECTED', 'REJECTED'].includes(e.type));
        const rerouteEv = c.events.find((e) => e.type === 'REROUTED');

        if (rerouteEv) {
          reroutingCount++;
        }

        if (submitEv && ackEv) {
          const diffMs = new Date(ackEv.createdAt).getTime() - new Date(submitEv.createdAt).getTime();
          const diffMins = Math.max(0, Math.round(diffMs / (60 * 1000)));
          ackDurationsMinutes.push(diffMins);
        }
      });

      // Calculate median acknowledgement time
      let medianAckMinutes: number | null = null;
      if (ackDurationsMinutes.length > 0) {
        ackDurationsMinutes.sort((a, b) => a - b);
        const mid = Math.floor(ackDurationsMinutes.length / 2);
        medianAckMinutes = ackDurationsMinutes.length % 2 !== 0
          ? ackDurationsMinutes[mid]
          : Math.round((ackDurationsMinutes[mid - 1] + ackDurationsMinutes[mid]) / 2);
      }

      const rejectionRate = totalCases > 0 ? Number((rejectionsCount / totalCases).toFixed(2)) : 0;
      const capacitySignalsCount = capacitySignals.length;

      // Deterministic severity categorization // requires clinical/ops approval
      let severity: BlackspotSeverity = 'LOW';
      if (rejectionRate >= 0.40 || capacitySignalsCount >= 8) {
        severity = 'CRITICAL';
      } else if (rejectionRate >= 0.25 || capacitySignalsCount >= 5) {
        severity = 'HIGH';
      } else if (rejectionRate >= 0.10 || capacitySignalsCount >= 2) {
        severity = 'MEDIUM';
      }

      blackspots.push({
        facilityId: facility.id,
        facilityName: facility.name,
        facilityNameKn: facility.nameKn,
        district: facility.district,
        districtKn: facility.districtKn,
        facilityType: facility.type,
        totalCases,
        rejectionsCount,
        rejectionRate,
        capacitySignalsCount,
        capacitySignalsByReason,
        reroutingCount,
        medianAckMinutes,
        severity,
      });
    }

    // Sort blackspots by severity (CRITICAL first) and rejection rate descending
    const severityRank: Record<BlackspotSeverity, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    blackspots.sort((a, b) => {
      const rankDiff = severityRank[b.severity] - severityRank[a.severity];
      if (rankDiff !== 0) return rankDiff;
      return b.rejectionRate - a.rejectionRate;
    });

    return {
      disclaimer: BLACKSPOT_CONFIG.PILOT_DISCLAIMER,
      minThreshold,
      rollingWindowDays: rollingDays,
      totalFacilitiesTracked: facilities.length,
      suppressedFacilitiesCount,
      blackspots,
    };
  }

  /**
   * GET /api/v1/blackspot/facilities/:id/signals
   * Returns non-identifying capacity signals list for a facility
   */
  async getFacilitySignals(
    facilityId: string,
    query: { rollingDays?: number },
    _user: AuthUser,
  ): Promise<FacilitySignalsResponse> {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      throw new Error(`Facility '${facilityId}' not found`);
    }

    const rollingDays = query.rollingDays ? Math.max(1, query.rollingDays) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rollingDays);

    const signals = await prisma.capacitySignal.findMany({
      where: {
        facilityId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        caseId: true,
        reasonCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      disclaimer: BLACKSPOT_CONFIG.PILOT_DISCLAIMER,
      facilityId: facility.id,
      facilityName: facility.name,
      facilityNameKn: facility.nameKn,
      district: facility.district,
      facilityType: facility.type,
      totalSignals: signals.length,
      signals: signals.map((s) => ({
        id: s.id,
        caseId: s.caseId,
        reasonCode: s.reasonCode,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }
}

export const blackspotService = new BlackspotService();
