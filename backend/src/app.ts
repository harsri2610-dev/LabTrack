import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { generalRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import bookingRoutes from "./modules/bookings/bookings.routes";
import sampleRoutes from "./modules/samples/samples.routes";
import reportRoutes from "./modules/reports/reports.routes";
import doctorRoutes from "./modules/doctors/doctors.routes";
import catalogRoutes from "./modules/catalog/catalog.routes";
import adminRoutes from "./modules/admin/admin.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(generalRateLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/samples", sampleRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/doctors", doctorRoutes);
  app.use("/api/catalog", catalogRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
