import { z } from "zod";

export const grantAccessSchema = z.object({
  doctorId: z.string().uuid(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});
