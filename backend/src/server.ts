import { createApp } from "./app";
import { env } from "./config/env";
import { connectMongo, closeMongo, getMongoDb } from "./config/mongo";
import { redis } from "./config/redis";
import { logger } from "./utils/logger";
import { startReportWorker } from "./modules/reports/reports.queue";

async function main() {
  const db = await connectMongo();
  await db.command({ ping: 1 });
  logger.info("MongoDB connected successfully");
  await redis.ping();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`, { env: env.nodeEnv });
  });
  server.on("error", (error) => {
    logger.error("HTTP server failed to start", { port: env.port, error: error.message });
  });

  // In production, run this in a dedicated `worker` container instead (see docker-compose.yml).
  // Kept inline here so `npm run dev` gives you a fully working stack with one command.
  if (env.nodeEnv !== "test") {
    startReportWorker();
  }

  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    server.close();
    await closeMongo();
    redis.disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Fatal startup error", err);
  process.exit(1);
});
