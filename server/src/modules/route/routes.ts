import { Router, Response, NextFunction } from "express";
import { waypointService } from "./service";
import { createWaypointSchema, updateWaypointSchema, reorderWaypointsSchema } from "./validation";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const waypointRouter = Router();

waypointRouter.use(authenticate);

waypointRouter.get(
  "/:missionId/waypoints",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const waypoints = await waypointService.listByMission(req.params.missionId);
      res.json(waypoints);
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.post(
  "/:missionId/waypoints",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createWaypointSchema.parse(req.body);
      const waypoint = await waypointService.create(req.params.missionId, data);
      res.status(201).json(waypoint);
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.put(
  "/:missionId/waypoints/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateWaypointSchema.parse(req.body);
      const waypoint = await waypointService.update(req.params.id, data);
      res.json(waypoint);
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.delete(
  "/:missionId/waypoints/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await waypointService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

waypointRouter.put(
  "/:missionId/waypoints/reorder",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { waypointIds } = reorderWaypointsSchema.parse(req.body);
      const waypoints = await waypointService.reorder(req.params.missionId, waypointIds);
      res.json(waypoints);
    } catch (err) {
      next(err);
    }
  },
);
