import { Router, Response, NextFunction } from "express";
import { notificationService } from "./service";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List current user's notifications
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema: { type: boolean }
 *         description: Filter to unread notifications only
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *         description: Maximum number of notifications to return
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 */
notificationRouter.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const notifications = await notificationService.getNotifications(req.user!.userId, {
      unreadOnly,
      limit,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
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
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification not found
 */
notificationRouter.patch("/:id/read", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     responses:
 *       204:
 *         description: All notifications marked as read
 */
notificationRouter.post("/read-all", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead(req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
