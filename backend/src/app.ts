import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import sportsRoutes from "./routes/sports.routes";
import careRoutes from "./routes/care.routes";
import eventsRoutes from "./routes/events.routes";
import providersRoutes from "./routes/providers.routes";
import miniAppsRoutes from "./routes/miniapps.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { optionalAuth } from "./middleware/auth.middleware";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(optionalAuth);

  app.get("/health", (_req, res) => {
    res.status(200).json({ data: { status: "ok" } });
  });

  app.use("/auth", authRoutes);
  app.use("/sports", sportsRoutes);
  app.use("/care", careRoutes);
  app.use("/events", eventsRoutes);
  app.use("/providers", providersRoutes);
  app.use("/mini-apps", miniAppsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
