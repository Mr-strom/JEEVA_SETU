import { z } from 'zod';
import { DispositionCategory, FollowUpType } from '@prisma/client';
import { uuidSchema } from '../shared/validation';

export const recordDispositionSchema = z.object({
  category: z.nativeEnum(DispositionCategory, {
    errorMap: () => ({ message: 'Approved disposition category is required' }),
  }),
  detail: z.string().max(500, 'Notes must be 500 characters or fewer').optional().nullable(),
  transferredToFacilityId: uuidSchema.optional().nullable(),
});

export type RecordDispositionInput = z.infer<typeof recordDispositionSchema>;

export const recordDischargeSchema = z.object({
  followUpDueDate: z.string().datetime().optional(),
  ownerId: uuidSchema.optional(),
  type: z.nativeEnum(FollowUpType).default(FollowUpType.HOME_VISIT),
  dischargeSummary: z.string().max(500).optional().nullable(),
});

export type RecordDischargeInput = z.infer<typeof recordDischargeSchema>;

export const closeReferralSchema = z.object({
  closureReason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export type CloseReferralInput = z.infer<typeof closeReferralSchema>;
