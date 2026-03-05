import express from "express";
import { createServer } from "http";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./infra/config";
import { swaggerSpec } from "./infra/swagger";
import { initSocketServer } from "./infra/socket";
import { errorHandler } from "./shared/middleware/error-handler";
import { authRouter } from "./modules/users/routes";
import { missionRouter } from "./modules/mission/routes";
import { waypointRouter } from "./modules/route/routes";
import { threatRouter, missionThreatRouter } from "./modules/threat/routes";
import { weatherRouter } from "./modules/weather/routes";
import { deconflictionRouter } from "./modules/deconfliction/routes";
import { aircraftRouter } from "./modules/mission/aircraft-routes";

const app = express();
const httpServer = createServer(app);
initSocketServer(httpServer);

app.use(cors());
app.use(express.json());

// Swagger docs
app.get("/api/docs/spec.json", (_req, res) => {
  res.json(swaggerSpec);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Mission Planning API Docs",
}));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/missions", missionRouter);
app.use("/api/missions", waypointRouter);
app.use("/api/threats", threatRouter);
app.use("/api/missions", missionThreatRouter);
app.use("/api/missions", weatherRouter);
app.use("/api/missions", deconflictionRouter);
app.use("/api/missions", aircraftRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler (must be last)
app.use(errorHandler);

// Only start server if not in test mode
if (config.nodeEnv !== "test") {
  httpServer.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { app, httpServer };
