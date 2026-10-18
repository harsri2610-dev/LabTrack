// Standalone entry point for the background job worker.
// Run this as its own container/process in production (see docker-compose `worker` service)
// so PDF generation and notification jobs don't compete with API request handling.
import { connectMongo, closeMongo, getMongoDb } from "./config/mongo";
import { redis } from "./config/redis";
import { logger } from "./utils/logger";
import { startReportWorker } from "./modules/reports/reports.queue";

async function main() {
  const db = await connectMongo();
  await db.command({ ping: 1 });
  await redis.ping();
  logger.info("Worker process starting...");
  startReportWorker();
}

main().catch((err) => {
  console.error("Fatal worker startup error", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await closeMongo();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeMongo();
  process.exit(0);
});
