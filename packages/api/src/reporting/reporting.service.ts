import { Role, CaseStatus } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';

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

export class ReportingService {
  /**
   * GET /api/v1/reporting/summary
   * Aggregates role-specific summary cards for open, overdue, escalated, rerouted, and closed cases
   */
  async getDashboardSummary(user: AuthUser): Promise<DashboardSummary> {
    const where: Record<string, unknown> = {};

    // 1. Role Scope Enforcement
    if (user.role === Role.FRONTLINE_WORKER) {
      where.OR = [
        { createdById: user.id },
        { assignedToId: user.id },
        ...(user.facilityId ? [{ sendingFacilityId: user.facilityId }] : []),
      ];
    } else if (user.role === Role.SENDING_FACILITY) {
      where.sendingFacilityId = user.facilityId;
    } else if (user.role === Role.RECEIVING_FACILITY || user.role === Role.CLINICIAN) {
      where.receivingFacilityId = user.facilityId;
    } else if (user.role === Role.DISTRICT_SUPERVISOR) {
      if (user.district) {
        where.OR = [
          { sendingFacility: { district: user.district } },
          { receivingFacility: { district: user.district } },
        ];
      }
    }

    const now = new Date();

    const [
      totalCases,
      openCases,
      overdueAck,
      overdueFollowUp,
      escalatedFollowUp,
      reroutedCases,
      closedCases,
    ] = await Promise.all([
      prisma.referralCase.count({ where }),
      prisma.referralCase.count({
        where: {
          ...where,
          status: {
            in: [
              CaseStatus.ACKNOWLEDGEMENT_PENDING,
              CaseStatus.ACCEPTED,
              CaseStatus.IN_TRANSIT,
              CaseStatus.ARRIVED,
              CaseStatus.CLINICAL_DISPOSITION_RECORDED,
              CaseStatus.FOLLOW_UP_DUE,
            ],
          },
        },
      }),
      prisma.referralCase.count({
        where: {
          ...where,
          status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
          acknowledgementDeadline: { lt: now },
        },
      }),
      prisma.referralCase.count({
        where: {
          ...where,
          status: CaseStatus.FOLLOW_UP_DUE,
          followUpDueDate: { lt: now },
        },
      }),
      prisma.referralCase.count({
        where: {
          ...where,
          status: CaseStatus.FOLLOW_UP_ESCALATED,
        },
      }),
      prisma.referralCase.count({
        where: {
          ...where,
          status: { in: [CaseStatus.REDIRECTED, CaseStatus.REROUTED] },
        },
      }),
      prisma.referralCase.count({
        where: {
          ...where,
          status: CaseStatus.CLOSED,
        },
      }),
    ]);

    return {
      role: user.role,
      openCases,
      overdueCount: overdueAck + overdueFollowUp,
      escalatedCount: escalatedFollowUp,
      reroutedCount: reroutedCases,
      closedCount: closedCases,
      totalCases,
      timestamp: now.toISOString(),
    };
  }
}

export const reportingService = new ReportingService();
