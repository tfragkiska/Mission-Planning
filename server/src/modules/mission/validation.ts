import { z } from "zod";

export const createMissionSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["TRAINING", "OPERATIONAL"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export const updateMissionSchema = createMissionSchema.partial();

export const transitionSchema = z.object({
  status: z.enum([
    "DRAFT", "PLANNED", "UNDER_REVIEW", "APPROVED",
    "REJECTED", "BRIEFED", "EXECUTING", "DEBRIEFED",
  ]),
  comments: z.string().optional(),
});
