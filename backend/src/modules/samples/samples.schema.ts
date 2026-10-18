import { z } from "zod";

export const updateSampleStatusSchema = z.object({
  status: z.enum(["collected", "in_transit", "received_at_lab", "processing", "completed", "rejected"]),
  note: z.string().optional(),
});

export const registerSampleSchema = z.object({
  bookingId: z.string().uuid(),
});
