import { z } from "zod";

export const createWeatherSchema = z.object({
  stationId: z.string().min(1).max(10),
  type: z.enum(["METAR", "TAF"]),
  rawReport: z.string().min(1),
  temperature: z.number().optional(),
  windSpeed: z.number().optional(),
  windDir: z.number().min(0).max(360).optional(),
  visibility: z.number().optional(),
  ceiling: z.number().optional(),
  conditions: z.string().optional(),
  isManual: z.boolean().optional(),
  observedAt: z.string().datetime(),
});

export const parseMetarSchema = z.object({
  raw: z.string().min(1),
});
