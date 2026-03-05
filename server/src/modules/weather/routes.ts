import { Router, Response, NextFunction } from "express";
import { weatherService } from "./service";
import { createWeatherSchema, parseMetarSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const weatherRouter = Router();
weatherRouter.use(authenticate);

/**
 * @swagger
 * /missions/{missionId}/weather:
 *   get:
 *     summary: List weather reports for a mission
 *     tags: [Weather]
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
 *                 $ref: '#/components/schemas/WeatherReport'
 */
weatherRouter.get("/:missionId/weather", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await weatherService.listByMission(req.params.missionId);
    res.json(reports);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/weather:
 *   post:
 *     summary: Add weather report to mission
 *     tags: [Weather]
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
 *             required: [stationId, type, rawReport]
 *             properties:
 *               stationId: { type: string }
 *               type: { type: string, enum: [METAR, TAF] }
 *               rawReport: { type: string }
 *               temperature: { type: number }
 *               windSpeed: { type: number }
 *               windDir: { type: number }
 *               visibility: { type: number }
 *     responses:
 *       201:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WeatherReport'
 */
weatherRouter.post("/:missionId/weather", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createWeatherSchema.parse(req.body);
    const report = await weatherService.addReport(req.params.missionId, data);
    res.status(201).json(report);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/weather/{id}:
 *   delete:
 *     summary: Delete a weather report
 *     tags: [Weather]
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
 *         description: Weather report deleted
 */
weatherRouter.delete("/:missionId/weather/:id", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await weatherService.deleteReport(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /missions/{missionId}/weather/parse-metar:
 *   post:
 *     summary: Parse a raw METAR string
 *     tags: [Weather]
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
 *             required: [raw]
 *             properties:
 *               raw: { type: string }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
weatherRouter.post("/:missionId/weather/parse-metar", authorize("PLANNER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { raw } = parseMetarSchema.parse(req.body);
    const parsed = weatherService.parseMetar(raw);
    res.json(parsed);
  } catch (err) { next(err); }
});
