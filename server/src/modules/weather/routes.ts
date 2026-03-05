import { Router, Response, NextFunction } from "express";
import { weatherService } from "./service";
import { createWeatherSchema, parseMetarSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const weatherRouter = Router();
weatherRouter.use(authenticate);

weatherRouter.get("/:missionId/weather", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await weatherService.listByMission(req.params.missionId);
    res.json(reports);
  } catch (err) { next(err); }
});

weatherRouter.post("/:missionId/weather", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createWeatherSchema.parse(req.body);
    const report = await weatherService.addReport(req.params.missionId, data);
    res.status(201).json(report);
  } catch (err) { next(err); }
});

weatherRouter.delete("/:missionId/weather/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await weatherService.deleteReport(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

weatherRouter.post("/:missionId/weather/parse-metar", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { raw } = parseMetarSchema.parse(req.body);
    const parsed = weatherService.parseMetar(raw);
    res.json(parsed);
  } catch (err) { next(err); }
});
