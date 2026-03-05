import { Router, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";
import { auditService } from "./service";

const router = Router();

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: List audit logs with filters
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [MISSION, WAYPOINT, THREAT, AIRCRAFT, CREW, USER]
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticate,
  authorize(Role.COMMANDER, Role.PLANNER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        userId,
        entityType,
        action,
        startDate,
        endDate,
        page = "1",
        limit = "50",
      } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      // PLANNER can only see their own audit logs
      const effectiveUserId =
        req.user!.role === Role.PLANNER ? req.user!.userId : userId;

      const result = await auditService.getAuditLogs({
        userId: effectiveUserId,
        entityType,
        action,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limitNum,
        offset,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /audit/mission/{id}:
 *   get:
 *     summary: Get audit trail for a specific mission
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Audit logs for the mission
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/mission/:id",
  authenticate,
  authorize(Role.COMMANDER, Role.PLANNER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const logs = await auditService.getAuditLogsForMission(req.params.id);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  },
);

export { router as auditRouter };
