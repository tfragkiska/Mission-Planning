import { Router, Response, NextFunction } from "express";
import { aircraftService } from "./aircraft-service";
import { createAircraftSchema, createCrewSchema } from "./aircraft-validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const aircraftRouter = Router();
aircraftRouter.use(authenticate);

// Aircraft
aircraftRouter.get("/:missionId/aircraft", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const aircraft = await aircraftService.listAircraft(req.params.missionId);
    res.json(aircraft);
  } catch (err) { next(err); }
});

aircraftRouter.post("/:missionId/aircraft", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createAircraftSchema.parse(req.body);
    const aircraft = await aircraftService.addAircraft(req.params.missionId, data);
    res.status(201).json(aircraft);
  } catch (err) { next(err); }
});

aircraftRouter.delete("/:missionId/aircraft/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await aircraftService.removeAircraft(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// Crew
aircraftRouter.get("/:missionId/crew", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const crew = await aircraftService.listCrew(req.params.missionId);
    res.json(crew);
  } catch (err) { next(err); }
});

aircraftRouter.post("/:missionId/crew", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCrewSchema.parse(req.body);
    const crew = await aircraftService.addCrew(req.params.missionId, data);
    res.status(201).json(crew);
  } catch (err) { next(err); }
});

aircraftRouter.delete("/:missionId/crew/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await aircraftService.removeCrew(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
