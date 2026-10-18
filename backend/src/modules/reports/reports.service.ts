import { v4 as uuid } from "uuid";
import { getMongoDb } from "../../config/mongo";
import { ApiError } from "../../utils/apiError";
import { enqueueReportRelease } from "./reports.queue";

export async function createDraftReport(input: { bookingId: string; sampleId?: string; resultData?: Record<string, unknown> }) {
  const db = getMongoDb();
  const booking = await db.collection("bookings").findOne({ id: input.bookingId });
  if (!booking) throw ApiError.notFound("Booking not found");

  // Prevent duplicate reports for the same booking
  const existingReport = await db.collection("reports").findOne({ booking_id: input.bookingId });
  if (existingReport) {
    return existingReport;
  }

  // Determine sampleId if not supplied
  let sampleId = input.sampleId;
  if (!sampleId) {
    const sample = await db.collection("samples").findOne({ booking_id: input.bookingId });
    sampleId = sample?.id || booking.sample_id;
  }

  // Prepare resultData: preserve real test parameters and leave result fields unfilled until valid results are entered
  let resultData = input.resultData ? { ...input.resultData } : {};
  if (!resultData.parameters || !Array.isArray(resultData.parameters) || resultData.parameters.length === 0) {
    const bookingTests = Array.isArray(booking.tests) ? booking.tests : [];
    const testNames = bookingTests.map((t: any) => t.name).filter(Boolean);

    const catalogTests = await db.collection("test_catalog").find({
      $or: [
        { id: { $in: bookingTests.map((t: any) => t.id).filter(Boolean) } },
        { name: { $in: testNames } },
      ],
    }).toArray();
    const catalogMap = new Map(catalogTests.map((c: any) => [c.id, c]));
    const catalogNameMap = new Map(catalogTests.map((c: any) => [c.name, c]));

    const parameters = bookingTests.map((t: any) => {
      const cat = catalogMap.get(t.id) || catalogNameMap.get(t.name);
      return {
        name: t.name,
        value: "", // unfilled until valid results are entered
        unit: cat?.sample_type === "blood" ? "mg/dL" : "—",
        reference_range: "Normal range",
        status: "normal" as const,
        methodology: "Automated Clinical Analyzer",
      };
    });

    resultData = {
      ...resultData,
      test_name: testNames.join(", ") || "Diagnostic Pathology Profile",
      parameters: parameters.length > 0 ? parameters : [
        {
          name: "Diagnostic Examination",
          value: "",
          unit: "—",
          reference_range: "Normal",
          status: "normal",
          methodology: "Automated Clinical Analyzer",
        },
      ],
    };
  }

  const report = {
    id: uuid(),
    booking_id: input.bookingId,
    patient_id: booking.patient_id,
    sample_id: sampleId ?? null,
    result_data: resultData,
    pdf_url: null,
    status: "draft",
    verified_by: null,
    verified_at: null,
    released_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.collection("reports").insertOne(report);
  return report;
}

export async function verifyReport(
  reportId: string,
  verifiedBy: string,
  resultData?: Record<string, unknown>,
  notes?: string
) {
  const db = getMongoDb();
  const updated = await db.collection("reports").findOneAndUpdate(
    { id: reportId, status: { $in: ["draft", "pending_verification"] } },
    {
      $set: {
        status: "verified",
        verified_by: verifiedBy,
        verified_at: new Date(),
        updated_at: new Date(),
        ...(resultData ? { result_data: resultData } : {}),
        ...(notes ? { verification_notes: notes } : {}),
      },
    },
    { returnDocument: "after" }
  );

  const report = (updated as any)?.value ?? updated;
  if (!report) throw ApiError.conflict("Report cannot be verified from its current state");
  return report;
}

export async function releaseReport(reportId: string) {
  const db = getMongoDb();
  const updated = await db.collection("reports").findOneAndUpdate(
    { id: reportId, status: "verified" },
    { $set: { status: "released", released_at: new Date(), updated_at: new Date() } },
    { returnDocument: "after" }
  );

  const report = (updated as any)?.value ?? updated;
  if (!report) throw ApiError.conflict("Only verified reports can be released");

  await enqueueReportRelease(reportId);
  return report;
}

export async function assertReportAccess(reportId: string, requester: { sub: string; role: string }) {
  const db = getMongoDb();
  const report = await db.collection("reports").findOne({
    $or: [{ id: reportId }, { booking_id: reportId }],
  });
  if (!report) throw ApiError.notFound("Report not found");

  // Enrich with patient name and booking metadata if available
  if (report.patient_id) {
    const patient = await db.collection("users").findOne({ id: report.patient_id }, { projection: { full_name: 1, phone: 1 } });
    if (patient) {
      report.patient_name = patient.full_name;
    }
  }
  if (report.booking_id) {
    const booking = await db.collection("bookings").findOne({ id: report.booking_id });
    if (booking) {
      report.scheduled_at = booking.scheduled_at;
      report.tests = booking.tests?.map((t: any) => t.name) || [];
      report.barcode = booking.barcode;
    }
  }

  if (["lab_staff", "pathologist", "admin"].includes(requester.role)) return report;

  if (requester.role === "patient" && report.patient_id === requester.sub) {
    if (!["released", "finalized"].includes(report.status)) {
      throw ApiError.forbidden("Report is not yet released");
    }
    return report;
  }

  if (requester.role === "doctor") {
    const access = await db.collection("doctor_patient_access").findOne({
      doctor_id: requester.sub,
      patient_id: report.patient_id,
      revoked: false,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    });
    if (access) {
      if (!["released", "finalized"].includes(report.status)) {
        throw ApiError.forbidden("Report is not yet released");
      }
      return report;
    }
  }

  throw ApiError.forbidden("You do not have access to this report");
}
