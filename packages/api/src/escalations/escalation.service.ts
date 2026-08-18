import { Role, EscalationStatus } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { escalationScanner } from './escalation-scanner';

export class EscalationsService {
  async runScanner() {
    return escalationScanner.scan();
  }

  async getEscalations(query: { status?: EscalationStatus; limit?: number }, user: AuthUser) {
    const whereClause: Record<string, any> = {};

    if (query.status) {
      whereClause.status = query.status;
    }

    if (user.role === Role.DISTRICT_SUPERVISOR && user.district) {
      whereClause.case = {
        OR: [
          { sendingFacility: { district: user.district } },
          { receivingFacility: { district: user.district } },
        ],
      };
    } else if (user.role === Role.SENDING_FACILITY && user.facilityId) {
      whereClause.case = { sendingFacilityId: user.facilityId };
    } else if (user.role === Role.RECEIVING_FACILITY && user.facilityId) {
      whereClause.case = { receivingFacilityId: user.facilityId };
    }

    return prisma.escalation.findMany({
      where: whereClause,
      take: query.limit || 50,
      orderBy: { startedAt: 'desc' },
      include: {
        case: {
          include: {
            patient: true,
            sendingFacility: true,
            receivingFacility: true,
          },
        },
        gapEvent: true,
        playbook: true,
        steps: { orderBy: { stepOrder: 'asc' } },
        assignee: true,
      },
    });
  }

  async getEscalationById(id: string, user: AuthUser) {
    const escalation = await prisma.escalation.findUnique({
      where: { id },
      include: {
        case: {
          include: {
            patient: true,
            sendingFacility: true,
            receivingFacility: true,
            events: { orderBy: { createdAt: 'asc' } },
          },
        },
        gapEvent: true,
        playbook: true,
        steps: { orderBy: { stepOrder: 'asc' } },
        assignee: true,
      },
    });

    if (!escalation) {
      throw new Error(`Escalation '${id}' not found`);
    }

    return escalation;
  }
}

export const escalationsService = new EscalationsService();
