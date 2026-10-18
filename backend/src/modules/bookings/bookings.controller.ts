import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/apiError";
import { createBooking, getBookingById, listBookingsForPatient, cancelBooking } from "./bookings.service";
import { recordAudit } from "../../utils/audit";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.user!.sub;
  const booking = await createBooking(patientId, req.body);
  await recordAudit({ actorId: patientId, action: "create_booking", resource: "booking", resourceId: booking.id });
  res.status(201).json({ booking });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const booking = await getBookingById(req.params.id);
  // Patients may only view their own bookings; staff/admin/doctor roles handled via RBAC upstream
  if (req.user!.role === "patient" && booking.patient_id !== req.user!.sub) {
    throw ApiError.forbidden();
  }
  res.json({ booking });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await listBookingsForPatient(req.user!.sub);
  res.json({ bookings });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const booking = await cancelBooking(
    req.params.id,
    req.user!.sub,
    req.user!.role === "admin"
  );
  await recordAudit({ actorId: req.user!.sub, action: "cancel_booking", resource: "booking", resourceId: booking.id });
  res.json({ booking });
});
