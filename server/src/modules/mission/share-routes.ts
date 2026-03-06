import { Router, Request, Response, NextFunction } from "express";
import { missionService } from "./service";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

// Authenticated routes for managing sharing on a mission
export const shareRouter = Router();

shareRouter.use(authenticate);

/**
 * @swagger
 * /missions/{id}/share:
 *   get:
 *     summary: Get sharing status for a mission
 *     tags: [Sharing]
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
 *               type: object
 *               properties:
 *                 shareToken: { type: string, nullable: true }
 *                 shareEnabled: { type: boolean }
 */
shareRouter.get("/:id/share", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await missionService.getShareStatus(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/share:
 *   post:
 *     summary: Enable sharing and generate a share token
 *     tags: [Sharing]
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
 *               type: object
 *               properties:
 *                 shareToken: { type: string }
 *                 shareUrl: { type: string }
 */
shareRouter.post("/:id/share", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await missionService.enableSharing(req.params.id, req.user!.userId);
    const shareUrl = `${req.protocol}://${req.get("host")}/shared/${result.shareToken}`;
    res.json({ shareToken: result.shareToken, shareUrl });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/share:
 *   delete:
 *     summary: Disable sharing for a mission
 *     tags: [Sharing]
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
 *               type: object
 *               properties:
 *                 shareEnabled: { type: boolean }
 */
shareRouter.delete("/:id/share", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await missionService.disableSharing(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Public route — no auth required
export const publicShareRouter = Router();

/**
 * @swagger
 * /shared/{token}:
 *   get:
 *     summary: Get mission data via share token (public, no auth)
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mission'
 *       404:
 *         description: Shared mission not found or sharing disabled
 */
publicShareRouter.get("/:token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mission = await missionService.getByShareToken(req.params.token);
    res.json(mission);
  } catch (err) {
    next(err);
  }
});
