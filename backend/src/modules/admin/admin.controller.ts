import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { getMongoDb } from "../../config/mongo";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import { recordAudit } from "../../utils/audit";

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const db = getMongoDb();

  const [
    totalUsers,
    totalPatients,
    totalDoctors,
    totalLabStaff,
    totalPathologists,
    totalBookings,
    totalSamples,
    totalReports,
    totalCatalog,
    bookings,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ role: "patient" }),
    db.collection("users").countDocuments({ role: "doctor" }),
    db.collection("users").countDocuments({ role: "lab_staff" }),
    db.collection("users").countDocuments({ role: "pathologist" }),
    db.collection("bookings").countDocuments(),
    db.collection("samples").countDocuments(),
    db.collection("reports").countDocuments(),
    db.collection("test_catalog").countDocuments(),
    db.collection("bookings").find({}, { projection: { total_amount: 1, status: 1 } }).toArray(),
  ]);

  const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0);
  const activeBookings = bookings.filter((b: any) => ["pending", "confirmed", "sample_collected", "in_lab"].includes(b.status)).length;
  const completedBookings = bookings.filter((b: any) => b.status === "completed").length;

  res.json({
    stats: {
      totalUsers,
      totalPatients,
      totalDoctors,
      totalLabStaff,
      totalPathologists,
      totalBookings,
      activeBookings,
      completedBookings,
      totalSamples,
      totalReports,
      totalCatalog,
      totalRevenue: totalRevenue.toFixed(2),
    },
  });
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const db = getMongoDb();
  const users = await db
    .collection("users")
    .find({}, { projection: { _id: 0, password_hash: 0, mfa_secret: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  res.json({ users });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, phone, role, registrationNo, clinicName, specialization } = req.body;
  if (!email || !password || !fullName || !role) {
    throw ApiError.badRequest("Missing required fields: email, password, fullName, role");
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = getMongoDb();
  const existing = await db.collection("users").findOne({ email: cleanEmail });
  if (existing) {
    throw ApiError.conflict("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuid();
  const newUser = {
    id: userId,
    email: cleanEmail,
    role,
    full_name: fullName,
    phone: phone || null,
    password_hash: passwordHash,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.collection("users").insertOne(newUser);

  if (role === "doctor" || role === "pathologist") {
    await db.collection("doctors").insertOne({
      user_id: userId,
      registration_no: registrationNo,
      clinic_name: clinicName || null,
      specialization: specialization || (role === "pathologist" ? "Pathology" : null),
      verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } else if (role === "patient") {
    await db.collection("patients").insertOne({
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  await recordAudit({
    actorId: req.user!.sub,
    action: "create_user_admin",
    resource: "user",
    resourceId: userId,
    metadata: { role, email: cleanEmail },
  });

  res.status(201).json({
    user: {
      id: userId,
      email: cleanEmail,
      role,
      full_name: fullName,
      phone,
      is_active: true,
      created_at: newUser.created_at,
    },
  });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, isActive } = req.body;
  const db = getMongoDb();

  const user = await db.collection("users").findOne({ id });
  if (!user) throw ApiError.notFound("User not found");

  if (user.role === "admin" && role && role !== "admin") {
    const adminCount = await db.collection("users").countDocuments({ role: "admin", is_active: true });
    if (adminCount <= 1) {
      throw ApiError.forbidden("Cannot demote the only active platform administrator");
    }
  }

  const updateFields: Record<string, unknown> = { updated_at: new Date() };
  if (role) updateFields.role = role;
  if (typeof isActive === "boolean") updateFields.is_active = isActive;

  await db.collection("users").updateOne({ id }, { $set: updateFields });

  await recordAudit({
    actorId: req.user!.sub,
    action: "update_user_admin",
    resource: "user",
    resourceId: id,
    metadata: { role, isActive },
  });

  const updated = await db.collection("users").findOne({ id }, { projection: { _id: 0, password_hash: 0, mfa_secret: 0 } });
  res.json({ user: updated });
});

export const listDoctorsForVerification = asyncHandler(async (_req: Request, res: Response) => {
  const db = getMongoDb();
  const doctors = await db.collection("doctors").find().toArray();
  const users = await db.collection("users").find({ role: { $in: ["doctor", "pathologist"] } }).toArray();

  const userMap = new Map(users.map((u: any) => [u.id, u]));

  const list = doctors.map((d: any) => {
    const u = userMap.get(d.user_id) || {};
    return {
      id: d.user_id,
      user_id: d.user_id,
      full_name: u.full_name || "Doctor",
      email: u.email || "",
      phone: u.phone || "",
      registration_no: d.registration_no || "Pending",
      clinic_name: d.clinic_name || "ApexCare Super-Speciality Hospital",
      specialization: d.specialization || "Clinical Consultant",
      verified: Boolean(d.verified),
      created_at: d.created_at || u.created_at || new Date(),
    };
  });

  res.json({ doctors: list });
});

export const setDoctorVerification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { verified } = req.body;
  const db = getMongoDb();

  const updated = await db.collection("doctors").updateOne(
    { user_id: id },
    { $set: { verified: Boolean(verified), updated_at: new Date() } }
  );

  if (updated.matchedCount === 0) {
    throw ApiError.notFound("Doctor record not found");
  }

  await recordAudit({
    actorId: req.user!.sub,
    action: verified ? "verify_doctor" : "reject_doctor",
    resource: "doctor",
    resourceId: id,
  });

  res.json({ success: true, verified: Boolean(verified) });
});

export const getAuditLogs = asyncHandler(async (_req: Request, res: Response) => {
  const db = getMongoDb();
  const logs = await db
    .collection("audit_logs")
    .find()
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  const userIds = [...new Set(logs.map((l: any) => l.actor_id).filter(Boolean))];
  const users = await db.collection("users").find({ id: { $in: userIds } }, { projection: { id: 1, full_name: 1, role: 1 } }).toArray();
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  const enriched = logs.map((l: any) => {
    const user = userMap.get(l.actor_id) as any;
    return {
      id: l.id,
      actor_name: user?.full_name || "System Actor",
      actor_role: user?.role || "system",
      action: l.action,
      resource: l.resource,
      resource_id: l.resource_id,
      ip_address: l.ip_address || "127.0.0.1",
      created_at: l.created_at,
      metadata: l.metadata,
    };
  });

  res.json({ auditLogs: enriched });
});

export const listAllBookings = asyncHandler(async (_req: Request, res: Response) => {
  const db = getMongoDb();
  const bookings = await db.collection("bookings").find().sort({ created_at: -1 }).toArray();

  const patientIds = [...new Set(bookings.map((b: any) => b.patient_id).filter(Boolean))];
  const patients = await db.collection("users").find({ id: { $in: patientIds } }, { projection: { id: 1, full_name: 1, email: 1 } }).toArray();
  const patientMap = new Map(patients.map((p: any) => [p.id, p]));

  const samples = await db.collection("samples").find({ booking_id: { $in: bookings.map((b: any) => b.id) } }).toArray();
  const sampleMap = new Map(samples.map((s: any) => [s.booking_id, s]));

  const list = bookings.map((b: any) => {
    const p = patientMap.get(b.patient_id) as any;
    const s = sampleMap.get(b.id) as any;
    return {
      ...b,
      patient_name: p?.full_name || "Registered Patient",
      patient_email: p?.email || "",
      sample_id: s?.id,
      barcode: s?.barcode,
    };
  });

  res.json({ bookings: list });
});
