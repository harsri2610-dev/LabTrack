import { v4 as uuid } from "uuid";
import { getMongoDb } from "../../config/mongo";
import { ApiError } from "../../utils/apiError";

export async function grantDoctorAccess(patientId: string, doctorId: string, grantedBy: string, expiresInDays?: number) {
  const db = getMongoDb();
  const doctors = db.collection("doctors");
  const access = db.collection("doctor_patient_access");

  let doctor = await doctors.findOne({
    $or: [{ user_id: doctorId }, { registration_no: doctorId }],
  });

  if (!doctor) {
    const match = doctorId.match(/\(([^)]+)\)/);
    if (match) {
      doctor = await doctors.findOne({ registration_no: match[1] });
    }
  }

  if (!doctor) {
    const user = await db.collection("users").findOne({
      $or: [{ email: doctorId }, { full_name: doctorId }, { id: doctorId }],
      role: { $in: ["doctor", "pathologist"] },
    });
    if (user) {
      doctor = await doctors.findOne({ user_id: user.id });
    }
  }

  if (!doctor) throw ApiError.notFound("Doctor not found");
  const actualDoctorId = doctor.user_id;

  const now = new Date();
  const expiresAt = expiresInDays ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const record = {
    id: uuid(),
    doctor_id: actualDoctorId,
    patient_id: patientId,
    granted_by: grantedBy,
    granted_at: now,
    expires_at: expiresAt,
    revoked: false,
  };

  await access.updateOne(
    { doctor_id: actualDoctorId, patient_id: patientId },
    { $set: { ...record, granted_at: now, expires_at: expiresAt, revoked: false }, $setOnInsert: { id: record.id } },
    { upsert: true }
  );

  return { ...record, id: record.id };
}

export async function revokeDoctorAccess(patientId: string, doctorId: string) {
  const db = getMongoDb();
  const access = db.collection("doctor_patient_access");
  const updated = await access.findOneAndUpdate(
    { patient_id: patientId, doctor_id: doctorId },
    { $set: { revoked: true } },
    { returnDocument: "after" }
  );

  const record = (updated as any)?.value ?? updated;
  if (!record) throw ApiError.notFound("Access grant not found");
  return record;
}

export async function listPatientsForDoctor(doctorId: string) {
  const db = getMongoDb();
  const users = db.collection("users");
  const access = db.collection("doctor_patient_access");

  const records = await access
    .find({
      doctor_id: doctorId,
      revoked: false,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    })
    .sort({ granted_at: -1 })
    .toArray();

  const patients = [] as any[];
  for (const record of records) {
    const user = await users.findOne({ id: record.patient_id }, { projection: { _id: 0, id: 1, full_name: 1, email: 1 } });
    if (user) {
      patients.push({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        granted_at: record.granted_at,
        expires_at: record.expires_at,
      });
    }
  }

  return patients;
}

export async function listReportsForDoctorPatient(doctorId: string, patientId: string) {
  const db = getMongoDb();
  const access = db.collection("doctor_patient_access");
  const accessRecord = await access.findOne({
    doctor_id: doctorId,
    patient_id: patientId,
    revoked: false,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  });

  if (!accessRecord) throw ApiError.forbidden("No active access grant for this patient");

  return db.collection("reports")
    .find({ patient_id: patientId, status: "released" }, { projection: { _id: 0, id: 1, status: 1, released_at: 1 } })
    .sort({ released_at: -1 })
    .toArray();
}
