import { Router, Response, NextFunction } from "express";
import { missionService } from "./service";
import { briefingService } from "./briefing-service";
import { versionService } from "./version-service";
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

// Briefing PDF download
missionRouter.get("/:id/briefing", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pdf = await briefingService.generatePdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="mission-briefing-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

// Version history
missionRouter.get("/:id/versions", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const versions = await versionService.listVersions(req.params.id);
    res.json(versions);
  } catch (err) { next(err); }
});

missionRouter.get("/:id/versions/:version", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.getVersion(req.params.id, parseInt(req.params.version, 10));
    res.json(version);
  } catch (err) { next(err); }
});
