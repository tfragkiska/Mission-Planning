import { Router, Response, NextFunction } from "express";
import { missionService } from "./service";
import { briefingService } from "./briefing-service";
import { versionService } from "./version-service";
import { cloneService } from "./clone-service";
import { createMissionSchema, updateMissionSchema, transitionSchema } from "./validation";
import { cloneMissionSchema, saveAsTemplateSchema, createFromTemplateSchema } from "./clone-validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const missionRouter = Router();

missionRouter.use(authenticate);

/**
 * @swagger
 * /missions:
 *   get:
 *     summary: List all missions
 *     tags: [Missions]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mission'
 */
missionRouter.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const missions = await missionService.list();
    res.json(missions);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/templates/list:
 *   get:
 *     summary: List mission templates
 *     tags: [Missions]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// Template routes - must be before /:id to avoid "templates" being treated as an ID
missionRouter.get("/templates/list", async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const templates = await cloneService.listTemplates();
    res.json(templates);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/templates/create:
 *   post:
 *     summary: Create mission from template
 *     tags: [Missions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateId]
 *             properties:
 *               templateId: { type: string, format: uuid }
 *               name: { type: string }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 */
missionRouter.post("/templates/create", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { templateId, name } = createFromTemplateSchema.parse(req.body);
    const mission = await cloneService.createFromTemplate(templateId, req.user!.userId, name);
    res.status(201).json(mission);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{id}:
 *   get:
 *     summary: Get mission by ID
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 *       404:
 *         description: Mission not found
 */
missionRouter.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mission = await missionService.getById(req.params.id);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions:
 *   post:
 *     summary: Create a new mission
 *     tags: [Missions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [TRAINING, OPERATIONAL] }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               scheduledStart: { type: string, format: date-time }
 *               scheduledEnd: { type: string, format: date-time }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 *       400:
 *         description: Validation error
 */
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

/**
 * @swagger
 * /missions/{id}:
 *   put:
 *     summary: Update a mission
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [TRAINING, OPERATIONAL] }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               scheduledStart: { type: string, format: date-time }
 *               scheduledEnd: { type: string, format: date-time }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 *       404:
 *         description: Mission not found
 */
missionRouter.put("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMissionSchema.parse(req.body);
    const mission = await missionService.update(req.params.id, data, req.user!.userId);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}:
 *   delete:
 *     summary: Delete a mission
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Mission deleted
 *       404:
 *         description: Mission not found
 */
missionRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await missionService.delete(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/transition:
 *   post:
 *     summary: Transition mission status
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [DRAFT, PLANNED, UNDER_REVIEW, APPROVED, REJECTED, BRIEFED, EXECUTING, DEBRIEFED] }
 *               comments: { type: string }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 *       400:
 *         description: Invalid transition
 */
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

/**
 * @swagger
 * /missions/{id}/briefing:
 *   get:
 *     summary: Download briefing PDF
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Briefing PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Mission not found
 */
// Briefing PDF download
missionRouter.get("/:id/briefing", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pdf = await briefingService.generatePdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="mission-briefing-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{id}/versions:
 *   get:
 *     summary: List version history
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// Version history
missionRouter.get("/:id/versions", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const versions = await versionService.listVersions(req.params.id);
    res.json(versions);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{id}/versions/{version}:
 *   get:
 *     summary: Get specific version
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Version not found
 */
missionRouter.get("/:id/versions/:version", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.getVersion(req.params.id, parseInt(req.params.version, 10));
    res.json(version);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{id}/clone:
 *   post:
 *     summary: Clone a mission
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 */
// Clone a mission
missionRouter.post("/:id/clone", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = cloneMissionSchema.parse(req.body);
    const cloned = await cloneService.cloneMission(req.params.id, req.user!.userId, name);
    res.status(201).json(cloned);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{id}/save-template:
 *   post:
 *     summary: Save mission as template
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateName]
 *             properties:
 *               templateName: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
// Save as template
missionRouter.post("/:id/save-template", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { templateName, description } = saveAsTemplateSchema.parse(req.body);
    const result = await cloneService.saveAsTemplate(req.params.id, templateName, description);
    res.json(result);
  } catch (err) { next(err); }
});
