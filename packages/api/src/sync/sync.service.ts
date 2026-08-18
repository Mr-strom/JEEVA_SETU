import { Role, CaseStatus } from '@prisma/client';
import { prisma } from '../shared/db';
import { AuthUser } from '../shared/types';
import { referralsService } from '../referrals/referrals.service';
import { followUpsService } from '../follow-ups/follow-ups.service';
import { caseEventsService } from '../case-events/case-events.service';
import {
  SyncBatchRequest,
  SyncMutation,
  SyncChangesQuery,
  SyncAckInput,
} from './sync.schema';

export interface SyncMutationResult {
  mutationId: string;
  operationType: string;
  status: 'applied' | 'already_applied' | 'conflict' | 'rejected';
  localCaseId?: string | null;
  serverCaseId?: string | null;
  serverEntityId?: string | null;
  result?: any;
  conflict?: {
    reason: string;
    serverState: any;
    nextAvailableAction: string;
  };
  error?: string;
}

export interface SyncBatchResponse {
  applied: SyncMutationResult[];
  alreadyApplied: SyncMutationResult[];
  conflicts: SyncMutationResult[];
  rejected: SyncMutationResult[];
  serverCursor: string;
  processedCount: number;
}

export class SyncService {
  /**
   * POST /api/v1/sync/batch
   * Process an ordered batch of offline mutations with idempotency, conflict detection, and server cursor
   */
  async processBatch(
    batch: SyncBatchRequest,
    user: AuthUser,
    requestId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SyncBatchResponse> {
    const applied: SyncMutationResult[] = [];
    const alreadyApplied: SyncMutationResult[] = [];
    const conflicts: SyncMutationResult[] = [];
    const rejected: SyncMutationResult[] = [];

    const now = new Date();

    for (const mutation of batch.mutations) {
      try {
        // 1. Idempotency Check: if idempotency key was already recorded, classify as already_applied
        const existingEvent = await caseEventsService.findByIdempotencyKey(mutation.idempotencyKey);
        if (existingEvent) {
          alreadyApplied.push({
            mutationId: mutation.mutationId,
            operationType: mutation.operationType,
            status: 'already_applied',
            localCaseId: mutation.localCaseId,
            serverCaseId: existingEvent.caseId,
            serverEntityId: existingEvent.id,
            result: existingEvent.payload,
          });
          continue;
        }

        // 2. Process by Operation Type
        if (mutation.operationType === 'CREATE_REFERRAL') {
          const payload: any = mutation.payload;
          const createdCase = await referralsService.createReferral(
            {
              isDraft: payload.isDraft ?? false,
              sendingFacilityId: payload.sendingFacilityId || user.facilityId || '22222222-2222-2222-2222-222222222203',
              receivingFacilityId: payload.receivingFacilityId || null,
              patientExternalId: payload.patientExternalId,
              patientName: payload.patientName,
              patientAge: payload.patientAge,
              gravida: payload.gravida,
              parity: payload.parity,
              lmp: payload.lmp,
              edd: payload.edd,
              riskFlags: payload.riskFlags || [],
              transportNeeded: payload.transportNeeded ?? false,
              transportMode: payload.transportMode || null,
              clinicalSummary: payload.clinicalSummary || null,
            },
            user,
            mutation.idempotencyKey,
            requestId,
            ipAddress,
            userAgent,
          );

          applied.push({
            mutationId: mutation.mutationId,
            operationType: mutation.operationType,
            status: 'applied',
            localCaseId: mutation.localCaseId,
            serverCaseId: createdCase.id,
            serverEntityId: createdCase.id,
            result: createdCase,
          });
        } else if (mutation.operationType === 'UPDATE_REFERRAL') {
          const targetId = (mutation.payload.caseId as string) || (mutation.localCaseId as string);
          if (!targetId) {
            rejected.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'rejected',
              error: 'Missing caseId for update mutation',
            });
            continue;
          }

          const existingCase = await prisma.referralCase.findFirst({
            where: { OR: [{ id: targetId }, { caseId: targetId }] },
          });

          if (!existingCase) {
            rejected.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'rejected',
              error: `ReferralCase '${targetId}' not found`,
            });
            continue;
          }

          // Conflict check: if case is already closed or in an incompatible status
          if (existingCase.status === CaseStatus.CLOSED) {
            conflicts.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'conflict',
              localCaseId: mutation.localCaseId,
              serverCaseId: existingCase.id,
              conflict: {
                reason: `Case is already CLOSED on the server. Edits cannot be applied.`,
                serverState: existingCase,
                nextAvailableAction: 'REFRESH_CASE_STATE',
              },
            });
            continue;
          }

          const updated = await referralsService.updateReferral(
            existingCase.id,
            mutation.payload as any,
            user,
            mutation.idempotencyKey,
            requestId,
            ipAddress,
            userAgent,
          );

          applied.push({
            mutationId: mutation.mutationId,
            operationType: mutation.operationType,
            status: 'applied',
            localCaseId: mutation.localCaseId,
            serverCaseId: updated.id,
            serverEntityId: updated.id,
            result: updated,
          });
        } else if (mutation.operationType === 'COMPLETE_FOLLOW_UP') {
          const taskId = mutation.payload.taskId as string;
          const existingTask = await prisma.followUpTask.findUnique({
            where: { id: taskId },
            include: { case: true },
          });

          if (!existingTask) {
            rejected.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'rejected',
              error: `FollowUpTask '${taskId}' not found`,
            });
            continue;
          }

          // Conflict detection: if follow-up task was already resolved or escalated concurrently
          if (existingTask.outcome !== null || existingTask.escalated) {
            conflicts.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'conflict',
              serverEntityId: existingTask.id,
              serverCaseId: existingTask.caseId,
              conflict: {
                reason: `Task was already resolved on server with outcome '${existingTask.outcome || 'ESCALATED'}'.`,
                serverState: existingTask,
                nextAvailableAction: 'REVIEW_RESOLVED_TASK',
              },
            });
            continue;
          }

          const completed = await followUpsService.completeFollowUp(
            taskId,
            {
              outcome: mutation.payload.outcome as any,
              notes: mutation.payload.notes as any,
            },
            user,
            mutation.idempotencyKey,
            requestId,
            ipAddress,
            userAgent,
          );

          applied.push({
            mutationId: mutation.mutationId,
            operationType: mutation.operationType,
            status: 'applied',
            serverEntityId: completed.id,
            serverCaseId: completed.caseId,
            result: completed,
          });
        } else if (mutation.operationType === 'ESCALATE_FOLLOW_UP') {
          const taskId = mutation.payload.taskId as string;
          const existingTask = await prisma.followUpTask.findUnique({
            where: { id: taskId },
            include: { case: true },
          });

          if (!existingTask) {
            rejected.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'rejected',
              error: `FollowUpTask '${taskId}' not found`,
            });
            continue;
          }

          if (existingTask.outcome !== null) {
            conflicts.push({
              mutationId: mutation.mutationId,
              operationType: mutation.operationType,
              status: 'conflict',
              serverEntityId: existingTask.id,
              serverCaseId: existingTask.caseId,
              conflict: {
                reason: `Task was already marked completed with outcome '${existingTask.outcome}'.`,
                serverState: existingTask,
                nextAvailableAction: 'REVIEW_RESOLVED_TASK',
              },
            });
            continue;
          }

          const escalated = await followUpsService.escalateFollowUp(
            taskId,
            { reason: mutation.payload.reason as string },
            user,
            mutation.idempotencyKey,
            requestId,
            ipAddress,
            userAgent,
          );

          applied.push({
            mutationId: mutation.mutationId,
            operationType: mutation.operationType,
            status: 'applied',
            serverEntityId: escalated.id,
            serverCaseId: escalated.caseId,
            result: escalated,
          });
        } else {
          rejected.push({
            mutationId: mutation.mutationId,
            operationType: mutation.operationType,
            status: 'rejected',
            error: `Unsupported operationType: ${mutation.operationType}`,
          });
        }
      } catch (err: any) {
        rejected.push({
          mutationId: mutation.mutationId,
          operationType: mutation.operationType,
          status: 'rejected',
          error: err.message || 'Mutation failed',
        });
      }
    }

    return {
      applied,
      alreadyApplied,
      conflicts,
      rejected,
      serverCursor: now.toISOString(),
      processedCount: batch.mutations.length,
    };
  }

  /**
   * GET /api/v1/sync/changes
   * Delta changes feed since last cursor, scoped to user role
   */
  async getChanges(query: SyncChangesQuery, user: AuthUser) {
    const whereCases: Record<string, unknown> = {};
    const whereTasks: Record<string, unknown> = {};

    // Role Scoping
    if (user.role === Role.FRONTLINE_WORKER) {
      whereCases.OR = [
        { createdById: user.id },
        { assignedToId: user.id },
        ...(user.facilityId ? [{ sendingFacilityId: user.facilityId }] : []),
      ];
      whereTasks.ownerId = user.id;
    } else if (user.role === Role.SENDING_FACILITY) {
      whereCases.sendingFacilityId = user.facilityId;
      whereTasks.case = { sendingFacilityId: user.facilityId };
    } else if (user.role === Role.RECEIVING_FACILITY || user.role === Role.CLINICIAN) {
      whereCases.receivingFacilityId = user.facilityId;
      whereTasks.case = { receivingFacilityId: user.facilityId };
    } else if (user.role === Role.DISTRICT_SUPERVISOR) {
      if (user.district) {
        whereCases.OR = [
          { sendingFacility: { district: user.district } },
          { receivingFacility: { district: user.district } },
        ];
        whereTasks.case = {
          OR: [
            { sendingFacility: { district: user.district } },
            { receivingFacility: { district: user.district } },
          ],
        };
      }
    }

    if (query.cursor) {
      const cursorDate = new Date(query.cursor);
      whereCases.updatedAt = { gt: cursorDate };
      whereTasks.updatedAt = { gt: cursorDate };
    }

    const [cases, followUps] = await Promise.all([
      prisma.referralCase.findMany({
        where: whereCases,
        take: query.limit,
        orderBy: { updatedAt: 'asc' },
        include: {
          patient: true,
          sendingFacility: true,
          receivingFacility: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.followUpTask.findMany({
        where: whereTasks,
        take: query.limit,
        orderBy: { updatedAt: 'asc' },
        include: {
          case: {
            include: { patient: true, sendingFacility: true, receivingFacility: true },
          },
        },
      }),
    ]);

    const nextCursor = new Date().toISOString();

    return {
      changes: {
        cases,
        followUps,
      },
      nextCursor,
      hasMore: cases.length === query.limit || followUps.length === query.limit,
    };
  }

  /**
   * POST /api/v1/sync/ack
   * Acknowledge sync cursor
   */
  async acknowledgeSync(input: SyncAckInput, user: AuthUser) {
    return {
      acknowledgedCursor: input.cursor,
      userId: user.id,
      timestamp: new Date().toISOString(),
    };
  }
}

export const syncService = new SyncService();
