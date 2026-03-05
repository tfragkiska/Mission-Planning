import { Router, Response, NextFunction } from "express";
import { threatService } from "./service";
import { createThreatSchema, updateThreatSchema, addThreatToMissionSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const threatRouter = Router();
threatRouter.use(authenticate);

/**
 * @swagger
 * /threats:
 *   get:
 *     summary: List all threats
 *     tags: [Threats]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Threat'
 */
// Global threat CRUD
threatRouter.get("/", async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const threats = await threatService.list();
    res.json(threats);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /threats/{id}:
 *   get:
 *     summary: Get threat by ID
 *     tags: [Threats]
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
 *               $ref: '#/components/schemas/Threat'
 *       404:
 *         description: Threat not found
 */
threatRouter.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const threat = await threatService.getById(req.params.id);
    res.json(threat);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /threats:
 *   post:
 *     summary: Create a threat
 *     tags: [Threats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, lat, lon, rangeNm, lethality]
 *             properties:
 *               name: { type: string }
 *               category: { type: string, enum: [SAM, AAA, MANPAD, RADAR, FIGHTER, OTHER] }
 *               lat: { type: number }
 *               lon: { type: number }
 *               rangeNm: { type: number }
 *               lethality: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               active: { type: boolean }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Threat'
 */
threatRouter.post("/", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createThreatSchema.parse(req.body);
    const threat = await threatService.create(data);
    res.status(201).json(threat);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /threats/{id}:
 *   put:
 *     summary: Update a threat
 *     tags: [Threats]
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
 *               category: { type: string, enum: [SAM, AAA, MANPAD, RADAR, FIGHTER, OTHER] }
 *               lat: { type: number }
 *               lon: { type: number }
 *               rangeNm: { type: number }
 *               lethality: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Threat'
 *       404:
 *         description: Threat not found
 */
threatRouter.put("/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateThreatSchema.parse(req.body);
    const threat = await threatService.update(req.params.id, data);
    res.json(threat);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /threats/{id}:
 *   delete:
 *     summary: Delete a threat
 *     tags: [Threats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Threat deleted
 *       404:
 *         description: Threat not found
 */
threatRouter.delete("/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await threatService.delete(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export const missionThreatRouter = Router();
missionThreatRouter.use(authenticate);

/**
 * @swagger
 * /missions/{missionId}/threats:
 *   get:
 *     summary: List threats for a mission
 *     tags: [Threats]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Threat'
 */
// Mission-specific threat operations (mounted under /api/missions)
missionThreatRouter.get("/:missionId/threats", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const threats = await threatService.listByMission(req.params.missionId);
    res.json(threats);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/threats:
 *   post:
 *     summary: Add threat to mission
 *     tags: [Threats]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [threatId]
 *             properties:
 *               threatId: { type: string, format: uuid }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
missionThreatRouter.post("/:missionId/threats", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { threatId, notes } = addThreatToMissionSchema.parse(req.body);
    const result = await threatService.addToMission(req.params.missionId, threatId, notes);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/threats/{threatId}:
 *   delete:
 *     summary: Remove threat from mission
 *     tags: [Threats]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: threatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Threat removed from mission
 */
missionThreatRouter.delete("/:missionId/threats/:threatId", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await threatService.removeFromMission(req.params.missionId, req.params.threatId);
    res.status(204).send();
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/threats/nearby:
 *   get:
 *     summary: Find threats near mission route
 *     tags: [Threats]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: buffer
 *         schema: { type: number }
 *         description: Buffer distance in nautical miles (default 5)
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Threat'
 */
missionThreatRouter.get("/:missionId/threats/nearby", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bufferNm = req.query.buffer ? parseFloat(req.query.buffer as string) : 5;
    const threats = await threatService.findThreatsNearRoute(req.params.missionId, bufferNm);
    res.json(threats);
  } catch (err) { next(err); }
});
