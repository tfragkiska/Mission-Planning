import { z } from "zod";

export const createWaypointSchema = z.object({
  name: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  speed: z.number().positive().optional(),
  timeOnTarget: z.string().datetime().optional(),
  type: z.enum([
    "INITIAL_POINT", "WAYPOINT", "TARGET",
    "EGRESS_POINT", "LANDING", "RALLY_POINT",
  ]).optional(),
});

export const updateWaypointSchema = createWaypointSchema.partial().extend({
  sequenceOrder: z.number().int().positive().optional(),
});

export const reorderWaypointsSchema = z.object({
  waypointIds: z.array(z.string().uuid()),
});
