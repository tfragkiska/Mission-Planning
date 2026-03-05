import { z } from "zod";

export const createAircraftSchema = z.object({
  type: z.string().min(1).max(100),
  tailNumber: z.string().min(1).max(50),
  callsign: z.string().min(1).max(50),
});

export const createCrewSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(50),
  aircraftId: z.string().uuid().optional(),
});
