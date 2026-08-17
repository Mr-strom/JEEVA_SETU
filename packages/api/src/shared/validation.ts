import { z } from 'zod';
import { Role } from './types';

export const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  facilityId: uuidSchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const idempotencyHeaderSchema = z.object({
  'idempotency-key': uuidSchema.optional(),
});
