import { Router, Response, NextFunction } from "express";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";
import { threatFeedRegistry } from "./adapters";

export const threatFeedRouter = Router();

threatFeedRouter.use(authenticate);

/**
 * @swagger
 * /threats/feeds:
 *   get:
 *     summary: List registered threat feed adapters
 *     tags: [Threats]
 *     responses:
 *       200:
 *         description: List of feed adapters and their availability
 */
threatFeedRouter.get("/feeds", async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const adapters = threatFeedRegistry.getAdapters();
    const statuses = await Promise.all(
      adapters.map(async (a) => ({
        name: a.name,
        available: await a.isAvailable(),
      }))
    );
    res.json(statuses);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /threats/feeds/ingest:
 *   post:
 *     summary: Trigger ingestion from all available threat feeds
 *     tags: [Threats]
 *     responses:
 *       200:
 *         description: Ingestion results per adapter
 */
threatFeedRouter.post("/feeds/ingest", authorize("PLANNER", "COMMANDER"), async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const results = await threatFeedRegistry.ingestAll();
    res.json({ results });
  } catch (err) { next(err); }
});
