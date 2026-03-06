import { Router, Response, NextFunction } from "express";
import { exportService } from "./export-service";
import { authenticate } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const exportRouter = Router();

exportRouter.use(authenticate);

/**
 * @swagger
 * /missions/export/bulk-csv:
 *   post:
 *     summary: Export multiple missions as CSV
 *     tags: [Exports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [missionIds]
 *             properties:
 *               missionIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bulk CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request body
 */
exportRouter.post("/export/bulk-csv", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { missionIds } = req.body;
    if (!Array.isArray(missionIds) || missionIds.length === 0) {
      res.status(400).json({ error: "missionIds must be a non-empty array" });
      return;
    }
    const csv = await exportService.exportBulkCSV(missionIds);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="missions-bulk-export.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/export/csv:
 *   get:
 *     summary: Export mission as CSV
 *     tags: [Exports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: Mission not found
 */
exportRouter.get("/:id/export/csv", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const csv = await exportService.exportMissionCSV(req.params.id);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="mission-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/export/waypoints-csv:
 *   get:
 *     summary: Export waypoints only as CSV
 *     tags: [Exports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Waypoints CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       404:
 *         description: Mission not found
 */
exportRouter.get("/:id/export/waypoints-csv", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const csv = await exportService.exportWaypointsCSV(req.params.id);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="waypoints-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/export/kml:
 *   get:
 *     summary: Export mission as KML (Google Earth)
 *     tags: [Exports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: KML file download
 *         content:
 *           application/vnd.google-earth.kml+xml:
 *             schema:
 *               type: string
 *       404:
 *         description: Mission not found
 */
exportRouter.get("/:id/export/kml", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const kml = await exportService.exportMissionKML(req.params.id);
    res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
    res.setHeader("Content-Disposition", `attachment; filename="mission-${req.params.id}.kml"`);
    res.send(kml);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /missions/{id}/export/geojson:
 *   get:
 *     summary: Export mission as GeoJSON
 *     tags: [Exports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: GeoJSON file download
 *         content:
 *           application/geo+json:
 *             schema:
 *               type: object
 *       404:
 *         description: Mission not found
 */
exportRouter.get("/:id/export/geojson", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const geojson = await exportService.exportMissionGeoJSON(req.params.id);
    res.setHeader("Content-Type", "application/geo+json");
    res.setHeader("Content-Disposition", `attachment; filename="mission-${req.params.id}.geojson"`);
    res.json(geojson);
  } catch (err) {
    next(err);
  }
});
