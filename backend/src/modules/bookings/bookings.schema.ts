import { z } from "zod";

export const createBookingSchema = z.object({
  testIds: z.array(z.string().uuid()).min(1, "Select at least one test"),
  scheduledAt: z.string().datetime(),
  collectionType: z.enum(["home", "walk_in"]),
  address: z.string().optional(),
  referringDoctorId: z.string().uuid().optional(),
}).refine(
  (data) => data.collectionType !== "home" || !!data.address,
  { message: "Address is required for home collection", path: ["address"] }
);
