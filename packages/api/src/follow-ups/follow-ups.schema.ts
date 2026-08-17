import { z } from 'zod';
import { FollowUpOutcome, FollowUpType } from '@prisma/client';
import { uuidSchema, paginationSchema } from '../shared/validation';

export const listFollowUpsQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'OVERDUE', 'COMPLETED', 'ESCALATED']).optional(),
  dueDate: z.string().optional(),
  caseId: uuidSchema.optional(),
});

export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>;

export const completeFollowUpSchema = z.object({
  outcome: z.nativeEnum(FollowUpOutcome, {
    errorMap: () => ({ message: 'Follow-up outcome is required' }),
  }),
  notes: z.string().optional().nullable(),
});

export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;

export const escalateFollowUpSchema = z.object({
  reason: z.string().min(1, 'Escalation reason is required'),
});

export type EscalateFollowUpInput = z.infer<typeof escalateFollowUpSchema>;
