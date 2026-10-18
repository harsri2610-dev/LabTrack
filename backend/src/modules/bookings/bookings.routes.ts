import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { createBookingSchema } from "./bookings.schema";
import { create, getOne, listMine, cancel } from "./bookings.controller";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("patient"), validate(createBookingSchema), create);
router.get("/mine", requireRole("patient"), listMine);
router.get("/:id", getOne);
router.patch("/:id/cancel", requireRole("patient", "admin"), cancel);

export default router;
