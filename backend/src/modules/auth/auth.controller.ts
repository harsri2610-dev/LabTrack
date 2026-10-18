import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import { getMongoDb } from "../../config/mongo";
import {
  registerUser,
  bootstrapAdmin,
  authenticateUser,
  authenticatePatientWithFace,
  rotateRefreshToken,
  revokeAllSessionsForUser,
  checkLoginThrottle,
  resetLoginThrottle,
} from "./auth.service";
import { recordAudit } from "../../utils/audit";
import { env } from "../../config/env";
import { timingSafeEqual } from "node:crypto";

const REFRESH_COOKIE = "refresh_token";
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  await recordAudit({ actorId: user.id, action: "register", resource: "user", resourceId: user.id });
  res.status(201).json({ user });
});

export const bootstrapAdminAccount = asyncHandler(async (req: Request, res: Response) => {
  const configuredToken = env.adminBootstrapToken;
  const suppliedToken = req.get("x-admin-bootstrap-token");
  if (!configuredToken || configuredToken.length < 32) {
    throw new ApiError(503, "Admin bootstrap is not configured");
  }
  if (
    !suppliedToken
    || Buffer.byteLength(suppliedToken) !== Buffer.byteLength(configuredToken)
    || !timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(configuredToken))
  ) {
    throw ApiError.unauthorized("Invalid admin bootstrap authorization");
  }

  const user = await bootstrapAdmin(req.body);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  await checkLoginThrottle(email);

  const { accessToken, refreshToken, role } = await authenticateUser(email, password);
  await resetLoginThrottle(email);

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  await recordAudit({ action: "login", resource: "user", metadata: { email }, ipAddress: req.ip });
  res.json({ accessToken, role });
});

export const faceLogin = asyncHandler(async (req: Request, res: Response) => {
  const { faceDescriptor, email } = req.body;
  if (email) {
    await checkLoginThrottle(email);
  }

  const { accessToken, refreshToken, role } = await authenticatePatientWithFace(faceDescriptor, email);
  if (email) {
    await resetLoginThrottle(email);
  }

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  await recordAudit({ action: "face_login", resource: "user", metadata: { email, method: "biometric_template" }, ipAddress: req.ip });
  res.json({ accessToken, role });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized("No refresh token provided");

  const { accessToken, refreshToken, role } = await rotateRefreshToken(token);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ accessToken, role });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await revokeAllSessionsForUser(req.user.sub);
  }
  res.clearCookie(REFRESH_COOKIE);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized("Not authenticated");
  }
  const db = getMongoDb();
  const user = await db.collection("users").findOne(
    { id: req.user.sub, is_active: true },
    { projection: { _id: 0, password_hash: 0, mfa_secret: 0 } }
  );

  if (!user) {
    throw ApiError.unauthorized("User no longer exists or is inactive");
  }

  res.json({
    user: {
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      name: user.full_name,
      phone: user.phone,
      is_active: user.is_active,
      created_at: user.created_at,
    },
  });
});
