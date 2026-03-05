import { z } from "zod";

export const createAirspaceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["RESTRICTED", "PROHIBITED", "MOA", "WARNING", "ALERT", "TFR"]),
  minAltitude: z.number().optional(),
  maxAltitude: z.number().optional(),
  active: z.boolean().optional(),
  coordinates: z.array(z.array(z.number()).length(2)).min(3),
  notes: z.string().optional(),
});

export const updateAirspaceSchema = createAirspaceSchema.partial();
