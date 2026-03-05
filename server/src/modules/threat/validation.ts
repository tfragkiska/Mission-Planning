import { z } from "zod";

export const createThreatSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["SAM", "AAA", "MANPAD", "RADAR", "FIGHTER", "OTHER"]),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  rangeNm: z.number().positive(),
  lethality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  minAltitude: z.number().optional(),
  maxAltitude: z.number().optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateThreatSchema = createThreatSchema.partial();

export const addThreatToMissionSchema = z.object({
  threatId: z.string().uuid(),
  notes: z.string().optional(),
});
