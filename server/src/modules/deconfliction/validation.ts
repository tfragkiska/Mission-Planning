import { z } from "zod";

export const runCheckSchema = z.object({
  missionId: z.string().uuid(),
});

export const resolveConflictSchema = z.object({
  id: z.string().uuid(),
});
