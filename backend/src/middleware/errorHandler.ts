import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.status >= 500) logger.error(err.message, { stack: err.stack });
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  logger.error("Unhandled error", { err: err instanceof Error ? err.stack : err });
  return res.status(500).json({ error: "Internal server error" });
}
