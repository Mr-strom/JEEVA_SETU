import { z } from 'zod';
import { CaseStatus } from '@prisma/client';
import { uuidSchema, paginationSchema } from '../shared/validation';

export const createReferralSchema = z
  .object({
    isDraft: z.boolean().default(false),
    sendingFacilityId: uuidSchema,
    receivingFacilityId: uuidSchema.optional().nullable(),
    patientExternalId: z.string().min(1, 'Patient ID is required'),
    patientName: z.string().optional(),
    patientAge: z.number().int().min(10).max(80).optional().nullable(),
    gravida: z.number().int().min(1).max(20).optional().nullable(),
    parity: z.number().int().min(0).max(20).optional().nullable(),
    lmp: z.string().datetime().optional().nullable(),
    edd: z.string().datetime().optional().nullable(),
    riskFlags: z.array(z.string()).default([]), // requires clinical approval
    transportNeeded: z.boolean().default(false),
    transportMode: z.string().optional().nullable(),
    clinicalSummary: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // If not a draft, receivingFacilityId is strictly required
    if (!data.isDraft && !data.receivingFacilityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receivingFacilityId'],
        message: 'Receiving facility is required for submitted referrals',
      });
    }
  });

export type CreateReferralInput = z.infer<typeof createReferralSchema>;

export const updateReferralSchema = z.object({
  receivingFacilityId: uuidSchema.optional().nullable(),
  riskFlags: z.array(z.string()).optional(),
  transportNeeded: z.boolean().optional(),
  transportMode: z.string().optional().nullable(),
  clinicalSummary: z.string().optional().nullable(),
  assignedToId: uuidSchema.optional().nullable(),
});

export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;

export const listReferralsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(CaseStatus).optional(),
  facilityId: uuidSchema.optional(),
  district: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type ListReferralsQuery = z.infer<typeof listReferralsQuerySchema>;

export const addCaseEventSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  payload: z.record(z.unknown()).optional(),
});

export type AddCaseEventInput = z.infer<typeof addCaseEventSchema>;
