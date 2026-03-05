import { z } from "zod";

export const cloneMissionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const saveAsTemplateSchema = z.object({
  templateName: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const createFromTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(200),
});
