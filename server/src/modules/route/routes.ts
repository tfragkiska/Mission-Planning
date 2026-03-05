import { Router, Response, NextFunction } from "express";
import { waypointService } from "./service";
import { createWaypointSchema, updateWaypointSchema, reorderWaypointsSchema } from "./validation";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const waypointRouter = Router();

waypointRouter.use(authenticate);

/**
 * @swagger
 * /missions/{missionId}/waypoints:
 *   get:
 *     summary: List waypoints for a mission
 *     tags: [Waypoints]
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
 *                 $ref: '#/components/schemas/Waypoint'
 */
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

/**
 * @swagger
 * /missions/{missionId}/waypoints:
 *   post:
 *     summary: Add waypoint to mission
 *     tags: [Waypoints]
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
 *             required: [lat, lon]
 *             properties:
 *               lat: { type: number, minimum: -90, maximum: 90 }
 *               lon: { type: number, minimum: -180, maximum: 180 }
 *               name: { type: string }
 *               altitude: { type: number }
 *               speed: { type: number }
 *               type: { type: string, enum: [INITIAL_POINT, WAYPOINT, TARGET, EGRESS_POINT, LANDING, RALLY_POINT] }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Waypoint'
 */
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

/**
 * @swagger
 * /missions/{missionId}/waypoints/{id}:
 *   put:
 *     summary: Update a waypoint
 *     tags: [Waypoints]
 *     parameters:
 *       - in: path
 *         name: missionId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *               lat: { type: number }
 *               lon: { type: number }
 *               name: { type: string }
 *               altitude: { type: number }
 *               speed: { type: number }
 *               type: { type: string, enum: [INITIAL_POINT, WAYPOINT, TARGET, EGRESS_POINT, LANDING, RALLY_POINT] }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Waypoint'
 *       404:
 *         description: Waypoint not found
 */
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

/**
 * @swagger
 * /missions/{missionId}/waypoints/{id}:
 *   delete:
 *     summary: Delete a waypoint
 *     tags: [Waypoints]
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
 *         description: Waypoint deleted
 *       404:
 *         description: Waypoint not found
 */
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

/**
 * @swagger
 * /missions/{missionId}/waypoints/reorder:
 *   put:
 *     summary: Reorder waypoints
 *     tags: [Waypoints]
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
 *             required: [waypointIds]
 *             properties:
 *               waypointIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Waypoint'
 */
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
