import { Role, AuditAction } from '@prisma/client';
import { prisma } from '../shared/db';
import { NotFoundError } from '../shared/errors';
import { auditService } from '../audit/audit.service';

export interface UserFilters {
  role?: Role;
  facilityId?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  name?: string;
  phone?: string | null;
  role?: Role;
  facilityId?: string | null;
  isActive?: boolean;
}

export class UsersService {
  async listUsers(filters: UserFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.facilityId) {
      where.facilityId = filters.facilityId;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await prisma.user.findMany({
      where,
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            nameKn: true,
            district: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User', id);
    }

    return user;
  }

  async updateUser(
    id: string,
    data: UpdateUserData,
    actorId: string,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.getUserById(id);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.facilityId !== undefined && { facilityId: data.facilityId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        facility: true,
      },
    });

    // Record immutable audit event for user modification / deactivation
    await auditService.record({
      actorId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      before: {
        name: existing.name,
        phone: existing.phone,
        role: existing.role,
        facilityId: existing.facilityId,
        isActive: existing.isActive,
      },
      after: {
        name: updated.name,
        phone: updated.phone,
        role: updated.role,
        facilityId: updated.facilityId,
        isActive: updated.isActive,
      },
      requestId,
      ipAddress,
      userAgent,
    });

    return updated;
  }
}

export const usersService = new UsersService();
