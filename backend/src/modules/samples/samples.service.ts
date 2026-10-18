import { v4 as uuid } from "uuid";
import { getMongoDb } from "../../config/mongo";
import { ApiError } from "../../utils/apiError";
import { createDraftReport } from "../reports/reports.service";

const VALID_TRANSITIONS: Record<string, string[]> = {
  collected: ["in_transit", "rejected"],
  in_transit: ["received_at_lab", "rejected"],
  received_at_lab: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

function generateBarcode(): string {
  return `LAB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function registerSample(bookingId: string, collectedBy: string) {
  const db = getMongoDb();
  const bookings = db.collection("bookings");
  const samples = db.collection("samples");
  const booking = await bookings.findOne(
    { id: bookingId },
    { projection: { _id: 0, id: 1, sample_id: 1 } }
  );
  if (!booking) throw ApiError.notFound("Booking not found");

  const existingSample = await samples.findOne({ booking_id: bookingId });
  if (existingSample) return existingSample;

  let sampleId = typeof booking.sample_id === "string" ? booking.sample_id : undefined;
  if (!sampleId) {
    await bookings.updateOne(
      { id: bookingId, $or: [{ sample_id: { $exists: false } }, { sample_id: null }] },
      { $set: { sample_id: uuid(), updated_at: new Date() } }
    );
    const currentBooking = await bookings.findOne(
      { id: bookingId },
      { projection: { _id: 0, sample_id: 1 } }
    );
    if (!currentBooking) throw ApiError.notFound("Booking not found");
    sampleId = typeof currentBooking.sample_id === "string" ? currentBooking.sample_id : undefined;
  }
  if (!sampleId) throw new Error("Could not assign a sample ID to the booking.");

  const sample = {
    id: sampleId,
    booking_id: bookingId,
    barcode: generateBarcode(),
    status: "collected",
    collected_by: collectedBy,
    collected_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  try {
    await samples.insertOne(sample);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const registeredSample = await samples.findOne({ booking_id: bookingId });
      if (registeredSample) return registeredSample;
    }
    throw error;
  }

  await db.collection("sample_status_log").insertOne({
    id: uuid(),
    sample_id: sample.id,
    status: "collected",
    changed_by: collectedBy,
    note: "Sample collected",
    changed_at: new Date(),
  });
  await db.collection("bookings").updateOne({ id: bookingId }, { $set: { status: "sample_collected", updated_at: new Date() } });

  return sample;
}


export async function updateSampleStatus(
  sampleId: string,
  newStatus: string,
  changedBy: string,
  note?: string
) {
  const db = getMongoDb();

  const sample = await db.collection("samples").findOne(
    { id: sampleId },
    { projection: { _id: 0, id: 1, status: 1, booking_id: 1 } }
  );

  if (!sample) throw ApiError.notFound("Sample not found");

  const allowed = VALID_TRANSITIONS[sample.status] || [];

  if (!allowed.includes(newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition sample from '${sample.status}' to '${newStatus}'`
    );
  }

  const updated = await db.collection("samples").findOneAndUpdate(
    { id: sampleId },
    { $set: { status: newStatus, updated_at: new Date() } },
    { returnDocument: "after" }
  );

  const updatedSample = (updated as any)?.value ?? updated;
  if (!updatedSample) throw ApiError.notFound("Sample not found");

  await db.collection("sample_status_log").insertOne({
    id: uuid(),
    sample_id: sampleId,
    status: newStatus,
    changed_by: changedBy,
    note: note ?? null,
    changed_at: new Date(),
  });

  if (newStatus === "processing") {
    await db.collection("bookings").updateOne(
      { id: sample.booking_id },
      { $set: { status: "in_lab", updated_at: new Date() } }
    );
  }

  if (newStatus === "completed") {
    const existingReport = await db.collection("reports").findOne({
      booking_id: sample.booking_id,
    });

    if (!existingReport) {
      await createDraftReport({
        bookingId: sample.booking_id,
        sampleId,
        resultData: {},
      });
    }

    await db.collection("bookings").updateOne(
      { id: sample.booking_id },
      { $set: { status: "completed", updated_at: new Date() } }
    );
  }

  return updatedSample;
}

export async function getSampleHistory(sampleId: string) {
  const db = getMongoDb();

  const sample = await db.collection("samples").findOne({ id: sampleId });
  if (!sample) throw ApiError.notFound("Sample not found");

  const history = await db
    .collection("sample_status_log")
    .find({ sample_id: sampleId })
    .sort({ changed_at: 1 })
    .toArray();

  const enrichedHistory = [];

  for (const entry of history) {
    const user = entry.changed_by
      ? await db.collection("users").findOne(
          { id: entry.changed_by },
          { projection: { _id: 0, full_name: 1 } }
        )
      : null;

    enrichedHistory.push({
      status: entry.status,
      note: entry.note,
      changed_at: entry.changed_at,
      changed_by_name: user?.full_name ?? null,
    });
  }

  return { sample, history: enrichedHistory };
}