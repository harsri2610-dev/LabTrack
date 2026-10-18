import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createDraftReport, verifyReport, releaseReport, assertReportAccess } from "./reports.service";
import { recordAudit } from "../../utils/audit";

export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const report = await createDraftReport(req.body);
  await recordAudit({ actorId: req.user!.sub, action: "create_draft_report", resource: "report", resourceId: report.id });
  res.status(201).json({ report });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  const report = await verifyReport(req.params.id, req.user!.sub, req.body.resultData, req.body.notes);
  await recordAudit({ actorId: req.user!.sub, action: "verify_report", resource: "report", resourceId: report.id });
  res.json({ report });
});

export const release = asyncHandler(async (req: Request, res: Response) => {
  const report = await releaseReport(req.params.id);
  await recordAudit({ actorId: req.user!.sub, action: "release_report", resource: "report", resourceId: report.id });
  res.json({ report });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const report = await assertReportAccess(req.params.id, req.user!);
  // Every view of a released report is logged — this is the "who viewed what patient result" trail.
  await recordAudit({
    actorId: req.user!.sub,
    action: "view_report",
    resource: "report",
    resourceId: report.id,
    ipAddress: req.ip,
  });
  res.json({ report });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const { getMongoDb } = await import("../../config/mongo");
  const db = getMongoDb();
  let query: any = {};
  if (req.user!.role === "patient") {
    query = { patient_id: req.user!.sub, status: { $in: ["released", "finalized"] } };
  } else if (req.user!.role === "doctor") {
    const accesses = await db.collection("doctor_patient_access").find({ doctor_id: req.user!.sub, revoked: false }).toArray();
    const patientIds = accesses.map((a: any) => a.patient_id);
    query = { patient_id: { $in: patientIds }, status: { $in: ["released", "finalized"] } };
  }
  // lab_staff, pathologist, admin see all reports
  const reports = await db.collection("reports").find(query).sort({ created_at: -1 }).toArray();

  const patientIds = Array.from(new Set(reports.map((r: any) => r.patient_id).filter(Boolean)));
  const patients = await db.collection("users").find({ id: { $in: patientIds } }, { projection: { id: 1, full_name: 1 } }).toArray();
  const patientMap = new Map(patients.map((p: any) => [p.id, p.full_name]));

  const bookings = await db.collection("bookings").find({ id: { $in: reports.map((r: any) => r.booking_id).filter(Boolean) } }).toArray();
  const bookingMap = new Map(bookings.map((b: any) => [b.id, b]));

  const enriched = reports.map((r: any) => {
    const b = bookingMap.get(r.booking_id) as any;
    return {
      ...r,
      patient_name: patientMap.get(r.patient_id) || r.patient_name || "Patient",
      tests: b?.tests?.map((t: any) => t.name) || r.tests || [],
      barcode: b?.barcode || r.barcode || "N/A",
    };
  });

  res.json({ reports: enriched });
});
