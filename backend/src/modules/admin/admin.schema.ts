import { z } from "zod";

const roleSchema = z.enum(["patient", "doctor", "lab_staff", "pathologist", "admin"]);

export const createUserSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  password: z.string().min(12),
  fullName: z.string().min(2),
  phone: z.string().min(8).optional(),
  role: roleSchema,
  registrationNo: z.string().optional(),
  clinicName: z.string().optional(),
  specialization: z.string().optional(),
}).refine(
  (data) => !["doctor", "pathologist"].includes(data.role) || Boolean(data.registrationNo?.trim()),
  { message: "registrationNo is required for doctor and pathologist accounts", path: ["registrationNo"] }
);

export const updateUserSchema = z.object({
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.role !== undefined || data.isActive !== undefined,
  { message: "Provide a role or account status to update" }
);
