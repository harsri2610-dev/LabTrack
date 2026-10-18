import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { createDraftReportSchema, verifyReportSchema } from "./reports.schema";
import { createDraft, verify, release, getOne, getAll } from "./reports.controller";

const router = Router();
router.use(authenticate);

router.post("/", requireRole("lab_staff", "pathologist"), validate(createDraftReportSchema), createDraft);
router.patch("/:id/verify", requireRole("pathologist", "admin"), validate(verifyReportSchema), verify);
router.patch("/:id/release", requireRole("pathologist", "admin"), release);

// Accessible to patient/doctor/staff — fine-grained filtering inside getAll / assertReportAccess
router.get("/", getAll);
router.get("/:id", getOne);

export default router;
