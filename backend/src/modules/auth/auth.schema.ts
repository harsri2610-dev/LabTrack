import { z } from "zod";

export const registerSchema = z.object({
  role: z.enum(["patient", "doctor"]), // staff/admin accounts are provisioned internally, not self-registered
  fullName: z.string().min(2),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().min(8),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // doctor-only fields
  registrationNo: z.string().optional(),
  clinicName: z.string().optional(),
  // optional patient biometric enrollment
  faceDescriptor: z.array(z.number()).length(64).optional(),
  biometricConsent: z.boolean().optional(),
}).refine(
  (data) => data.role !== "doctor" || !!data.registrationNo,
  { message: "registrationNo is required for doctor accounts", path: ["registrationNo"] }
).refine(
  (data) => !data.faceDescriptor || (data.role === "patient" && data.biometricConsent === true),
  { message: "Biometric enrollment requires patient role and explicit user consent", path: ["biometricConsent"] }
);

export const loginSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1),
});

export const faceLoginSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase().trim()).optional(),
  faceDescriptor: z.array(z.number()).length(64, "Face descriptor must be exactly 64 dimensional"),
});

export const bootstrapAdminSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().transform((email) => email.toLowerCase().trim()),
  phone: z.string().min(8),
  password: z.string().min(12, "Password must be at least 12 characters"),
});
