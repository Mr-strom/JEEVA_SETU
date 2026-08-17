import { prisma } from '../shared/db';

export interface FacilityFilters {
  district?: string;
  type?: string;
  isActive?: boolean;
}

export class FacilitiesService {
  async listFacilities(filters: FacilityFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.district) {
      where.district = { equals: filters.district, mode: 'insensitive' };
    }
    if (filters.type) {
      where.type = { equals: filters.type, mode: 'insensitive' };
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await prisma.facility.findMany({
      where,
      orderBy: [{ district: 'asc' }, { name: 'asc' }],
    });
  }

  async getFacilityById(id: string) {
    return await prisma.facility.findUnique({
      where: { id },
    });
  }
}

export const facilitiesService = new FacilitiesService();
