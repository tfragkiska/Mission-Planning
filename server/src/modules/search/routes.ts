import { Router, Response, NextFunction } from "express";
import { searchService } from "./service";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";
import { ValidationError } from "../../shared/errors";

export const searchRouter = Router();
searchRouter.use(authenticate);

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Global search across missions, waypoints, threats, and users
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated entity types to search (missions,waypoints,threats,users)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results per type
 *     responses:
 *       200:
 *         description: Grouped search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 missions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       type: { type: string }
 *                       status: { type: string }
 *                       priority: { type: string }
 *                       score: { type: number }
 *                 waypoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       lat: { type: number }
 *                       lon: { type: number }
 *                       type: { type: string }
 *                       missionId: { type: string }
 *                       missionName: { type: string }
 *                       score: { type: number }
 *                 threats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       category: { type: string }
 *                       lethality: { type: string }
 *                       active: { type: boolean }
 *                       score: { type: number }
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       email: { type: string }
 *                       role: { type: string }
 *                       score: { type: number }
 *                 totalCount:
 *                   type: integer
 *       400:
 *         description: Missing search query
 *       401:
 *         description: Unauthorized
 */
searchRouter.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string | undefined;
    if (!query || !query.trim()) {
      throw new ValidationError("Search query parameter 'q' is required");
    }

    const typesParam = req.query.types as string | undefined;
    const validTypes = ["missions", "waypoints", "threats", "users"] as const;
    let types: typeof validTypes[number][] | undefined;
    if (typesParam) {
      types = typesParam.split(",").filter((t): t is typeof validTypes[number] =>
        (validTypes as readonly string[]).includes(t.trim()),
      );
      if (types.length === 0) {
        throw new ValidationError(`Invalid types. Valid values: ${validTypes.join(", ")}`);
      }
    }

    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError("Limit must be between 1 and 100");
    }

    const results = await searchService.globalSearch(
      query,
      req.user!.userId,
      req.user!.role,
      { limit, types },
    );

    res.json(results);
  } catch (err) {
    next(err);
  }
});
