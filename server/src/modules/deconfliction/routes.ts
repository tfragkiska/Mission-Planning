import { Router, Response, NextFunction } from "express";
import { deconflictionService } from "./service";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const deconflictionRouter = Router();
deconflictionRouter.use(authenticate);

// Run deconfliction check for a mission
deconflictionRouter.post("/:missionId/deconfliction/run", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const results = await deconflictionService.runCheck(req.params.missionId);
    res.json(results);
  } catch (err) { next(err); }
});

// Get deconfliction results for a mission
deconflictionRouter.get("/:missionId/deconfliction", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const results = await deconflictionService.listByMission(req.params.missionId);
    res.json(results);
  } catch (err) { next(err); }
});

// Resolve a conflict
deconflictionRouter.post("/:missionId/deconfliction/:id/resolve", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await deconflictionService.resolve(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) { next(err); }
});

// Check if mission has unresolved critical conflicts
deconflictionRouter.get("/:missionId/deconfliction/status", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const hasCritical = await deconflictionService.hasUnresolvedCritical(req.params.missionId);
    res.json({ hasCritical, canApprove: !hasCritical });
  } catch (err) { next(err); }
});
