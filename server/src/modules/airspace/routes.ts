import { Router, Response, NextFunction } from "express";
import { airspaceService } from "./service";
import { createAirspaceSchema, updateAirspaceSchema } from "./validation";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { AuthenticatedRequest } from "../../shared/types";

export const airspaceRouter = Router();

airspaceRouter.use(authenticate);

/**
 * @swagger
 * /airspaces:
 *   get:
 *     summary: List all airspaces
 *     tags: [Airspace]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of airspaces
 */
airspaceRouter.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    if (req.query.active !== undefined) filters.active = req.query.active === "true";
    if (req.query.type) filters.type = req.query.type;
    const airspaces = await airspaceService.list(filters);
    res.json(airspaces);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /airspaces:
 *   post:
 *     summary: Create a new airspace
 *     tags: [Airspace]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, coordinates]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [RESTRICTED, PROHIBITED, MOA, WARNING, ALERT, TFR] }
 *               minAltitude: { type: number }
 *               maxAltitude: { type: number }
 *               coordinates: { type: array, items: { type: array, items: { type: number } } }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Airspace created
 */
airspaceRouter.post("/", authorize("PLANNER", "COMMANDER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = createAirspaceSchema.parse(req.body);
    const airspace = await airspaceService.create(data);
    res.status(201).json(airspace);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /airspaces/{id}:
 *   get:
 *     summary: Get airspace by ID
 *     tags: [Airspace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Airspace details
 */
airspaceRouter.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const airspace = await airspaceService.getById(req.params.id);
    res.json(airspace);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /airspaces/{id}:
 *   put:
 *     summary: Update an airspace
 *     tags: [Airspace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Airspace updated
 */
airspaceRouter.put("/:id", authorize("PLANNER", "COMMANDER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateAirspaceSchema.parse(req.body);
    const airspace = await airspaceService.update(req.params.id, data);
    res.json(airspace);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /airspaces/{id}:
 *   delete:
 *     summary: Delete an airspace
 *     tags: [Airspace]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
airspaceRouter.delete("/:id", authorize("PLANNER", "COMMANDER"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await airspaceService.delete(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
