import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { grantDoctorAccess, revokeDoctorAccess, listPatientsForDoctor, listReportsForDoctorPatient } from "./doctors.service";
import { recordAudit } from "../../utils/audit";

export const grantAccess = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const grant = await grantDoctorAccess(patientId, req.body.doctorId, patientId, req.body.expiresInDays);
  await recordAudit({
    actorId: patientId, action: "grant_doctor_access", resource: "doctor_patient_access",
    resourceId: grant.id, metadata: { doctorId: req.body.doctorId },
  });
  res.status(201).json({ grant });
});

export const revokeAccess = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const grant = await revokeDoctorAccess(patientId, req.params.doctorId);
  await recordAudit({ actorId: patientId, action: "revoke_doctor_access", resource: "doctor_patient_access", resourceId: grant.id });
  res.json({ grant });
});

export const myPatients = asyncHandler(async (req: Request, res: Response) => {
  const patients = await listPatientsForDoctor(req.user!.sub);
  res.json({ patients });
});

export const patientReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await listReportsForDoctorPatient(req.user!.sub, req.params.patientId);
  res.json({ reports });
});
