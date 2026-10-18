import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { registerSampleSchema, updateSampleStatusSchema } from "./samples.schema";
import { list, register, updateStatus, history } from "./samples.controller";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("lab_staff", "pathologist", "admin"), list);
router.post("/", requireRole("lab_staff", "pathologist", "admin"), validate(registerSampleSchema), register);
router.patch("/:id/status", requireRole("lab_staff", "pathologist", "admin"), validate(updateSampleStatusSchema), updateStatus);
router.get("/:id/history", history);

export default router;
