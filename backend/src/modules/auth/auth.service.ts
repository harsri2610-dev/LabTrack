import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { getMongoDb, withMongoTransaction } from "../../config/mongo";
import { redis } from "../../config/redis";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { ApiError } from "../../utils/apiError";
import { recordAudit } from "../../utils/audit";
import { env } from "../../config/env";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function encryptFaceDescriptor(descriptor: number[]): { encrypted: string; iv: string; tag: string } {
  const key = crypto.createHash("sha256").update(env.jwtAccessSecret + ":biometric-key").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(descriptor);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

function decryptFaceDescriptor(encryptedHex: string, ivHex: string, tagHex: string): number[] {
  const key = crypto.createHash("sha256").update(env.jwtAccessSecret + ":biometric-key").digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export async function registerUser(input: {
  role: "patient" | "doctor";
  fullName: string;
  email: string;
  phone: string;
  password: string;
  registrationNo?: string;
  clinicName?: string;
  faceDescriptor?: number[];
  biometricConsent?: boolean;
}) {
  const db = getMongoDb();
  const users = db.collection("users");
  const email = input.email.toLowerCase().trim();

  const existing = await users.findOne({ email });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const userId = uuid();
  const user = {
    id: userId,
    role: input.role,
    email,
    phone: input.phone,
    password_hash: passwordHash,
    full_name: input.fullName,
    mfa_secret: null,
    mfa_enabled: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await users.insertOne(user);

  if (input.role === "patient") {
    await db.collection("patients").insertOne({
      user_id: userId,
      dob: null,
      gender: null,
      address: null,
      emergency_contact: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (input.faceDescriptor && input.biometricConsent) {
      const encrypted = encryptFaceDescriptor(input.faceDescriptor);
      await db.collection("face_biometrics").insertOne({
        id: uuid(),
        user_id: userId,
        email,
        encrypted_template: encrypted.encrypted,
        iv: encrypted.iv,
        tag: encrypted.tag,
        algorithm: "normalized-geom-v1",
        enrolled_at: new Date(),
      });
    }
  } else {
    await db.collection("doctors").insertOne({
      user_id: userId,
      registration_no: input.registrationNo ?? null,
      clinic_name: input.clinicName ?? null,
      specialization: null,
      verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return { id: user.id, role: user.role, email: user.email, full_name: user.full_name };
}

export async function bootstrapAdmin(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const user = {
    id: uuid(),
    role: "admin",
    email: input.email.toLowerCase().trim(),
    phone: input.phone,
    password_hash: await bcrypt.hash(input.password, 10),
    full_name: input.fullName,
    mfa_secret: null,
    mfa_enabled: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  try {
    await withMongoTransaction(async (database, session) => {
      const users = database.collection("users");
      const existingAdmin = await users.findOne(
        { role: "admin" },
        { projection: { _id: 1 }, session }
      );
      if (existingAdmin) {
        throw ApiError.conflict("An admin account already exists");
      }

      await database.collection("admin_bootstrap").insertOne(
        { id: "initial-admin", user_id: user.id, created_at: new Date() },
        { session }
      );
      await users.insertOne(user, { session });
      await recordAudit({
        actorId: user.id,
        action: "bootstrap_admin",
        resource: "user",
        resourceId: user.id,
      }, session);
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      throw ApiError.conflict("Admin bootstrap has already been used or this email is already registered");
    }
    throw error;
  }

  return { id: user.id, role: user.role, email: user.email, full_name: user.full_name };
}

export async function authenticateUser(email: string, password: string) {
  const cleanEmail = email.toLowerCase().trim();
  const user = await getMongoDb().collection("users").findOne({ email: cleanEmail });
  if (!user || !user.is_active) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  return issueTokens(user.id, user.role, user.email);
}

export async function issueTokens(userId: string, role: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, role, email });
  const refreshToken = signRefreshToken({ sub: userId });

  await getMongoDb().collection("refresh_tokens").insertOne({
    id: uuid(),
    user_id: userId,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    created_at: new Date(),
  });

  return { accessToken, refreshToken, role };
}

export async function rotateRefreshToken(oldToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const record = await getMongoDb().collection("refresh_tokens").findOne({
    user_id: payload.sub,
    token_hash: hashToken(oldToken),
    revoked: false,
    expires_at: { $gt: new Date() },
  });

  if (!record) {
    throw ApiError.unauthorized("Refresh token expired or revoked");
  }

  await getMongoDb().collection("refresh_tokens").updateOne({ id: record.id }, { $set: { revoked: true } });

  const user = await getMongoDb().collection("users").findOne(
    { id: payload.sub, is_active: true },
    { projection: { id: 1, role: 1, email: 1 } }
  );
  if (!user) throw ApiError.unauthorized("User no longer exists or is inactive");

  return issueTokens(user.id, user.role, user.email);
}

export async function revokeAllSessionsForUser(userId: string) {
  await getMongoDb().collection("refresh_tokens").updateMany({ user_id: userId }, { $set: { revoked: true } });
}

export async function checkLoginThrottle(email: string) {
  const key = `login_attempts:${email}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, 15 * 60);
  if (attempts > 10) {
    throw ApiError.forbidden("Too many failed login attempts. Try again in 15 minutes.");
  }
}

export async function resetLoginThrottle(email: string) {
  await redis.del(`login_attempts:${email}`);
}

export async function authenticatePatientWithFace(faceDescriptor: number[], email?: string) {
  const db = getMongoDb();
  const biometrics = db.collection("face_biometrics");
  const users = db.collection("users");

  let candidateRecords: any[] = [];
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await users.findOne({ email: cleanEmail });
    if (!user || !user.is_active) {
      throw ApiError.unauthorized("No active patient account found with this email");
    }
    if (user.role !== "patient") {
      throw ApiError.forbidden("Face ID authentication is strictly reserved for patient accounts");
    }
    const bio = await biometrics.findOne({ user_id: user.id });
    if (!bio) {
      throw ApiError.unauthorized("Face ID has not been enrolled for this patient account. Please use password login.");
    }
    candidateRecords = [bio];
  } else {
    candidateRecords = await biometrics.find().toArray();
    if (candidateRecords.length === 0) {
      throw ApiError.unauthorized("No enrolled Face ID records found");
    }
  }

  let bestMatch: any = null;
  let minDistance = Infinity;

  for (const record of candidateRecords) {
    try {
      const storedVector = decryptFaceDescriptor(record.encrypted_template, record.iv, record.tag);
      if (!Array.isArray(storedVector) || storedVector.length !== faceDescriptor.length) continue;

      let sumSq = 0;
      for (let i = 0; i < faceDescriptor.length; i++) {
        const diff = faceDescriptor[i] - storedVector[i];
        sumSq += diff * diff;
      }
      const distance = Math.sqrt(sumSq);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = record;
      }
    } catch {
      // skip corrupted or invalid records
    }
  }

  // Strict similarity threshold for normalized 64-d unit vectors (identical is 0.0, random is > 1.0)
  const THRESHOLD = 0.42;
  if (!bestMatch || minDistance > THRESHOLD) {
    throw ApiError.unauthorized("Face biometric signature did not match any enrolled patient profile");
  }

  const matchedUser = await users.findOne({ id: bestMatch.user_id, is_active: true });
  if (!matchedUser) {
    throw ApiError.unauthorized("Patient account is no longer active");
  }
  if (matchedUser.role !== "patient") {
    throw ApiError.forbidden("Face ID authentication is strictly reserved for patient accounts");
  }

  return issueTokens(matchedUser.id, matchedUser.role, matchedUser.email);
}
