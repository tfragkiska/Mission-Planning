import { Router, Response, NextFunction } from "express";
import { missionService } from "./service";
import { createMissionSchema, updateMissionSchema, transitionSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const missionRouter = Router();

missionRouter.use(authenticate);

missionRouter.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const missions = await missionService.list();
    res.json(missions);
  } catch (err) {
    next(err);
  }
});

missionRouter.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mission = await missionService.getById(req.params.id);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});

missionRouter.post(
  "/",
  authorize("PLANNER"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createMissionSchema.parse(req.body);
      const mission = await missionService.create(data, req.user!.userId);
      res.status(201).json(mission);
    } catch (err) {
      next(err);
    }
  },
);

missionRouter.put("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMissionSchema.parse(req.body);
    const mission = await missionService.update(req.params.id, data, req.user!.userId);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});

missionRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await missionService.delete(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

missionRouter.post(
  "/:id/transition",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, comments } = transitionSchema.parse(req.body);
      const mission = await missionService.transition(
        req.params.id,
        status,
        req.user!.userId,
        req.user!.role,
        comments,
      );
      res.json(mission);
    } catch (err) {
      next(err);
    }
  },
);
