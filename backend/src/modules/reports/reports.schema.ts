import { z } from "zod";

export const createDraftReportSchema = z.object({
  bookingId: z.string().uuid(),
  sampleId: z.string().uuid().optional(),
  resultData: z.record(z.any()).optional().default({}),
});

export const verifyReportSchema = z.object({
  resultData: z.record(z.any()).optional(),
  notes: z.string().max(2000).optional(),
});
