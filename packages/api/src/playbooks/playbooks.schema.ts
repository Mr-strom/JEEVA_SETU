import { z } from 'zod';
import { GapPhase, GapCauseClass, Role } from '@prisma/client';

export const playbookStepTemplateSchema = z.object({
  order: z.number().int().min(1),
  description: z.string().min(3, 'Step description is required'),
  descriptionKn: z.string().min(3, 'Kannada description is required'),
  assigneeRole: z.nativeEnum(Role),
  slaHours: z.number().int().min(1).max(72),
  requiredEvidence: z.string().optional().nullable(),
});

export type PlaybookStepTemplate = z.infer<typeof playbookStepTemplateSchema>;

export const createPlaybookSchema = z.object({
  name: z.string().min(3, 'Playbook name is required'),
  nameKn: z.string().min(3, 'Kannada name is required'),
  triggerPhase: z.nativeEnum(GapPhase),
  triggerCause: z.nativeEnum(GapCauseClass),
  stepTemplates: z.array(playbookStepTemplateSchema).min(1, 'At least one step template is required'),
  isActive: z.boolean().optional().default(true),
});

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;

export const updatePlaybookSchema = z.object({
  name: z.string().min(3).optional(),
  nameKn: z.string().min(3).optional(),
  stepTemplates: z.array(playbookStepTemplateSchema).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePlaybookInput = z.infer<typeof updatePlaybookSchema>;
