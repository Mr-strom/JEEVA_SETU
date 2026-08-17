import { CaseStatus, Role } from '@prisma/client';
import { prisma } from '../shared/db';

export interface CreateCaseEventParams {
  caseId: string;
  type: string;
  fromStatus?: CaseStatus | null;
  toStatus?: CaseStatus | null;
  actorId: string;
  actorRole: Role;
  facilityId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
  requestId?: string | null;
}

export class CaseEventsService {
  /**
   * Appends an immutable CaseEvent to the case history
   */
  async recordEvent(params: CreateCaseEventParams) {
    return await prisma.caseEvent.create({
      data: {
        caseId: params.caseId,
        type: params.type,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        actorId: params.actorId,
        actorRole: params.actorRole,
        facilityId: params.facilityId,
        payload: params.payload ? JSON.parse(JSON.stringify(params.payload)) : {},
        idempotencyKey: params.idempotencyKey,
        requestId: params.requestId,
      },
    });
  }

  /**
   * Retrieves all events for a case in strict chronological order
   */
  async getTimelineByCaseId(caseId: string) {
    return await prisma.caseEvent.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Look up an existing event by its idempotency key to support safe replays
   */
  async findByIdempotencyKey(idempotencyKey: string) {
    return await prisma.caseEvent.findUnique({
      where: { idempotencyKey },
      include: {
        case: {
          include: {
            patient: true,
            sendingFacility: true,
            receivingFacility: true,
          },
        },
      },
    });
  }
}

export const caseEventsService = new CaseEventsService();
