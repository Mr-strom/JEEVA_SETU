import { z } from 'zod';
import { uuidSchema, paginationSchema } from '../shared/validation';

export const syncOperationTypeSchema = z.enum([
  'CREATE_REFERRAL',
  'UPDATE_REFERRAL',
  'COMPLETE_FOLLOW_UP',
  'ESCALATE_FOLLOW_UP',
]);

export type SyncOperationType = z.infer<typeof syncOperationTypeSchema>;

export const syncMutationSchema = z.object({
  mutationId: z.string().min(1, 'Mutation ID is required'),
  operationType: syncOperationTypeSchema,
  localCaseId: z.string().optional().nullable(),
  payload: z.record(z.unknown()),
  clientTimestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
});

export type SyncMutation = z.infer<typeof syncMutationSchema>;

export const syncBatchRequestSchema = z.object({
  mutations: z.array(syncMutationSchema).max(50, 'Batch size cannot exceed 50 mutations'),
  lastServerCursor: z.string().optional().nullable(),
});

export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;

export const syncChangesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SyncChangesQuery = z.infer<typeof syncChangesQuerySchema>;

export const syncAckSchema = z.object({
  cursor: z.string().min(1, 'Cursor is required'),
});

export type SyncAckInput = z.infer<typeof syncAckSchema>;
