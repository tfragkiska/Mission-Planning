import express from "express";
import cors from "cors";
import { config } from "./infra/config";
import { errorHandler } from "./shared/middleware/error-handler";
import { authRouter } from "./modules/users/routes";
import { missionRouter } from "./modules/mission/routes";
import { waypointRouter } from "./modules/route/routes";
import { threatRouter, missionThreatRouter } from "./modules/threat/routes";
import { weatherRouter } from "./modules/weather/routes";
import { deconflictionRouter } from "./modules/deconfliction/routes";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/missions", missionRouter);
app.use("/api/missions", waypointRouter);
app.use("/api/threats", threatRouter);
app.use("/api/missions", missionThreatRouter);
app.use("/api/missions", weatherRouter);
app.use("/api/missions", deconflictionRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler (must be last)
app.use(errorHandler);

// Only start server if not in test mode
if (config.nodeEnv !== "test") {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { app };
