import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getMongoDb } from "../../config/mongo";
import { registerSample, updateSampleStatus, getSampleHistory } from "./samples.service";
import { recordAudit } from "../../utils/audit";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const db = getMongoDb();
  const samples = await db.collection("samples").find().sort({ created_at: -1 }).toArray();

  const bookingIds = [...new Set(samples.map((s: any) => s.booking_id).filter(Boolean))];
  const bookings = await db.collection("bookings").find({ id: { $in: bookingIds } }).toArray();
  const bookingMap = new Map(bookings.map((b: any) => [b.id, b]));

  const patientIds = [...new Set(bookings.map((b: any) => b.patient_id).filter(Boolean))];
  const patients = await db.collection("users").find({ id: { $in: patientIds } }, { projection: { id: 1, full_name: 1 } }).toArray();
  const patientMap = new Map(patients.map((p: any) => [p.id, p]));

  const enriched = samples.map((s: any) => {
    const booking = bookingMap.get(s.booking_id) as any;
    const patient = booking?.patient_id ? patientMap.get(booking.patient_id) as any : null;
    return {
      ...s,
      patient_name: patient?.full_name || s.patient_name || "Patient",
      tests: booking?.tests?.map((t: any) => t.name) || [],
      collection_type: booking?.collection_type || s.collection_type || "walk_in",
    };
  });

  res.json({ samples: enriched });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const sample = await registerSample(req.body.bookingId, req.user!.sub);
  await recordAudit({ actorId: req.user!.sub, action: "register_sample", resource: "sample", resourceId: sample.id });
  res.status(201).json({ sample });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const sample = await updateSampleStatus(req.params.id, req.body.status, req.user!.sub, req.body.note);
  await recordAudit({
    actorId: req.user!.sub,
    action: "update_sample_status",
    resource: "sample",
    resourceId: sample.id,
    metadata: { newStatus: req.body.status },
  });
  res.json({ sample });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const data = await getSampleHistory(req.params.id);
  res.json(data);
});
