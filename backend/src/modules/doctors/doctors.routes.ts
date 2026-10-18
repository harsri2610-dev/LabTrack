import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { grantAccessSchema } from "./doctors.schema";
import { grantAccess, revokeAccess, myPatients, patientReports } from "./doctors.controller";

const router = Router();
router.use(authenticate);

// Patient-initiated consent management
router.post("/access", requireRole("patient"), validate(grantAccessSchema), grantAccess);
router.delete("/access/:doctorId", requireRole("patient"), revokeAccess);

// Doctor-side views — scoped to patients who granted access
router.get("/patients", requireRole("doctor"), myPatients);
router.get("/patients/:patientId/reports", requireRole("doctor"), patientReports);

export default router;
