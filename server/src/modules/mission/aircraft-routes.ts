import { Router, Response, NextFunction } from "express";
import { aircraftService } from "./aircraft-service";
import { createAircraftSchema, createCrewSchema } from "./aircraft-validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const aircraftRouter = Router();
aircraftRouter.use(authenticate);

/**
 * @swagger
 * /missions/{missionId}/aircraft:
 *   get:
 *     summary: List aircraft for a mission
 *     tags: [Aircraft]
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
 *                 $ref: '#/components/schemas/Aircraft'
 */
// Aircraft
aircraftRouter.get("/:missionId/aircraft", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const aircraft = await aircraftService.listAircraft(req.params.missionId);
    res.json(aircraft);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/aircraft:
 *   post:
 *     summary: Add aircraft to mission
 *     tags: [Aircraft]
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
 *             required: [type, tailNumber, callsign]
 *             properties:
 *               type: { type: string }
 *               tailNumber: { type: string }
 *               callsign: { type: string }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Aircraft'
 */
aircraftRouter.post("/:missionId/aircraft", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createAircraftSchema.parse(req.body);
    const aircraft = await aircraftService.addAircraft(req.params.missionId, data);
    res.status(201).json(aircraft);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/aircraft/{id}:
 *   delete:
 *     summary: Remove aircraft from mission
 *     tags: [Aircraft]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Aircraft removed
 */
aircraftRouter.delete("/:missionId/aircraft/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await aircraftService.removeAircraft(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/crew:
 *   get:
 *     summary: List crew members for a mission
 *     tags: [Crew]
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
 *                 $ref: '#/components/schemas/CrewMember'
 */
// Crew
aircraftRouter.get("/:missionId/crew", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const crew = await aircraftService.listCrew(req.params.missionId);
    res.json(crew);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/crew:
 *   post:
 *     summary: Add crew member to mission
 *     tags: [Crew]
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
 *             required: [name, role]
 *             properties:
 *               name: { type: string }
 *               role: { type: string }
 *               aircraftId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrewMember'
 */
aircraftRouter.post("/:missionId/crew", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCrewSchema.parse(req.body);
    const crew = await aircraftService.addCrew(req.params.missionId, data);
    res.status(201).json(crew);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/crew/{id}:
 *   delete:
 *     summary: Remove crew member from mission
 *     tags: [Crew]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Crew member removed
 */
aircraftRouter.delete("/:missionId/crew/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await aircraftService.removeCrew(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
