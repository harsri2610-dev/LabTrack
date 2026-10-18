import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { createUserSchema, updateUserSchema } from "./admin.schema";
import {
  getStats,
  listUsers,
  createUser,
  updateUserRole,
  listDoctorsForVerification,
  setDoctorVerification,
  getAuditLogs,
  listAllBookings,
} from "./admin.controller";

const router = Router();

router.use(authenticate);
router.use(requireRole("admin"));

router.get("/stats", getStats);
router.get("/users", listUsers);
router.post("/users", validate(createUserSchema), createUser);
router.patch("/users/:id/role", validate(updateUserSchema), updateUserRole);
router.get("/doctors", listDoctorsForVerification);
router.patch("/doctors/:id/verify", setDoctorVerification);
router.get("/audit-logs", getAuditLogs);
router.get("/bookings", listAllBookings);

export default router;
