import { CapacityReasonCode } from '@prisma/client';
import { prisma } from '../shared/db';

export interface CreateCapacitySignalParams {
  facilityId: string;
  reasonCode: CapacityReasonCode;
  detail?: string | null;
  reportedById: string;
  caseId?: string | null;
}

export class CapacitiesService {
  /**
   * Appends an immutable CapacitySignal to the facility's signal history
   */
  async recordCapacitySignal(params: CreateCapacitySignalParams) {
    return await prisma.capacitySignal.create({
      data: {
        facilityId: params.facilityId,
        reasonCode: params.reasonCode,
        detail: params.detail || null,
        reportedById: params.reportedById,
        caseId: params.caseId || null,
      },
      include: {
        facility: {
          select: { id: true, name: true, district: true },
        },
      },
    });
  }

  /**
   * List capacity signals for a facility or district
   */
  async listSignals(filters: { facilityId?: string; reasonCode?: CapacityReasonCode; district?: string }) {
    const where: Record<string, unknown> = {};

    if (filters.facilityId) {
      where.facilityId = filters.facilityId;
    }
    if (filters.reasonCode) {
      where.reasonCode = filters.reasonCode;
    }
    if (filters.district) {
      where.facility = { district: filters.district };
    }

    return await prisma.capacitySignal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        facility: {
          select: { id: true, name: true, district: true },
        },
      },
    });
  }
}

export const capacitiesService = new CapacitiesService();
