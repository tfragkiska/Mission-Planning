import { Router, Response, NextFunction } from "express";
import { deconflictionService } from "./service";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const deconflictionRouter = Router();
deconflictionRouter.use(authenticate);

/**
 * @swagger
 * /missions/{missionId}/deconfliction/run:
 *   post:
 *     summary: Run deconfliction check for a mission
 *     tags: [Deconfliction]
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
 *                 $ref: '#/components/schemas/DeconflictionResult'
 */
// Run deconfliction check for a mission
deconflictionRouter.post("/:missionId/deconfliction/run", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const results = await deconflictionService.runCheck(req.params.missionId);
    res.json(results);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/deconfliction:
 *   get:
 *     summary: Get deconfliction results for a mission
 *     tags: [Deconfliction]
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
 *                 $ref: '#/components/schemas/DeconflictionResult'
 */
// Get deconfliction results for a mission
deconflictionRouter.get("/:missionId/deconfliction", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const results = await deconflictionService.listByMission(req.params.missionId);
    res.json(results);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/deconfliction/{id}/resolve:
 *   post:
 *     summary: Resolve a conflict
 *     tags: [Deconfliction]
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
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeconflictionResult'
 */
// Resolve a conflict
deconflictionRouter.post("/:missionId/deconfliction/:id/resolve", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await deconflictionService.resolve(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/deconfliction/status:
 *   get:
 *     summary: Check if mission has unresolved critical conflicts
 *     tags: [Deconfliction]
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
 *               type: object
 *               properties:
 *                 hasCritical: { type: boolean }
 *                 canApprove: { type: boolean }
 */
// Check if mission has unresolved critical conflicts
deconflictionRouter.get("/:missionId/deconfliction/status", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const hasCritical = await deconflictionService.hasUnresolvedCritical(req.params.missionId);
    res.json({ hasCritical, canApprove: !hasCritical });
  } catch (err) { next(err); }
});
