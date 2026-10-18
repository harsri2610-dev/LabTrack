import { Router } from "express";
import { register, bootstrapAdminAccount, login, faceLogin, refresh, logout, me } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { registerSchema, bootstrapAdminSchema, loginSchema, faceLoginSchema } from "./auth.schema";
import { authenticate } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/bootstrap-admin", authRateLimiter, validate(bootstrapAdminSchema), bootstrapAdminAccount);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/face-login", authRateLimiter, validate(faceLoginSchema), faceLogin);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;
