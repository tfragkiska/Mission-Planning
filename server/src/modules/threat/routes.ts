import { Router, Response, NextFunction } from "express";
import { threatService } from "./service";
import { createThreatSchema, updateThreatSchema, addThreatToMissionSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const threatRouter = Router();
threatRouter.use(authenticate);

// Global threat CRUD
threatRouter.get("/", async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const threats = await threatService.list();
    res.json(threats);
  } catch (err) { next(err); }
});

threatRouter.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const threat = await threatService.getById(req.params.id);
    res.json(threat);
  } catch (err) { next(err); }
});

threatRouter.post("/", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createThreatSchema.parse(req.body);
    const threat = await threatService.create(data);
    res.status(201).json(threat);
  } catch (err) { next(err); }
});

threatRouter.put("/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateThreatSchema.parse(req.body);
    const threat = await threatService.update(req.params.id, data);
    res.json(threat);
  } catch (err) { next(err); }
});

threatRouter.delete("/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await threatService.delete(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export const missionThreatRouter = Router();
missionThreatRouter.use(authenticate);

// Mission-specific threat operations (mounted under /api/missions)
missionThreatRouter.get("/:missionId/threats", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const threats = await threatService.listByMission(req.params.missionId);
    res.json(threats);
  } catch (err) { next(err); }
});

missionThreatRouter.post("/:missionId/threats", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { threatId, notes } = addThreatToMissionSchema.parse(req.body);
    const result = await threatService.addToMission(req.params.missionId, threatId, notes);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

missionThreatRouter.delete("/:missionId/threats/:threatId", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await threatService.removeFromMission(req.params.missionId, req.params.threatId);
    res.status(204).send();
  } catch (err) { next(err); }
});

missionThreatRouter.get("/:missionId/threats/nearby", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bufferNm = req.query.buffer ? parseFloat(req.query.buffer as string) : 5;
    const threats = await threatService.findThreatsNearRoute(req.params.missionId, bufferNm);
    res.json(threats);
  } catch (err) { next(err); }
});
