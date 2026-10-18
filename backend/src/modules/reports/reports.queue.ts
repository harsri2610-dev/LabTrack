import { Queue, Worker, Job } from "bullmq";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env";
import { getMongoDb } from "../../config/mongo";
import { logger } from "../../utils/logger";

const connection = { url: env.redisUrl } as any;

export const reportQueue = new Queue("report-generation", { connection });

export async function enqueueReportRelease(reportId: string) {
  await reportQueue.add("release-report", { reportId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export function startReportWorker() {
  const worker = new Worker(
    "report-generation",
    async (job: Job) => {
      const { reportId } = job.data;
      logger.info("Processing report release job", { reportId });

      const pdfUrl = `/generated-reports/${reportId}.pdf`;
      const db = getMongoDb();

      await db.collection("reports").updateOne(
        { id: reportId },
        { $set: { pdf_url: pdfUrl, status: "released", released_at: new Date(), updated_at: new Date() } }
      );

      const report = await db.collection("reports").findOne({ id: reportId }, { projection: { _id: 0, patient_id: 1 } });
      const patientId = report?.patient_id;
      if (patientId) {
        await db.collection("notifications").insertOne({
          id: uuid(),
          user_id: patientId,
          type: "report_ready",
          channel: "email",
          payload: { reportId },
          status: "queued",
          created_at: new Date(),
        });
      }
      return { pdfUrl };
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    logger.error("Report job failed", { jobId: job?.id, err: err.message });
  });

  return worker;
}
