import { v4 as uuid } from "uuid";
import { getMongoDb } from "../../config/mongo";
import { ApiError } from "../../utils/apiError";

export async function createBooking(patientId: string, input: {
  testIds: string[];
  scheduledAt: string;
  collectionType: "home" | "walk_in";
  address?: string;
  referringDoctorId?: string;
}) {
  const db = getMongoDb();
  const testCatalog = db.collection("test_catalog");
  const bookings = db.collection("bookings");
  const bookingTests = db.collection("booking_tests");

  const tests = await testCatalog.find({ id: { $in: input.testIds }, is_active: true }).toArray();
  if (tests.length !== input.testIds.length) {
    throw ApiError.badRequest("One or more selected tests are invalid or inactive");
  }

  const total = tests.reduce((sum: number, test: any) => sum + Number(test.price), 0);
  const bookingId = uuid();
  const sampleId = uuid();
  const barcode = `APEX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const booking = {
    id: bookingId,
    patient_id: patientId,
    referring_doctor_id: input.referringDoctorId ?? null,
    scheduled_at: new Date(input.scheduledAt),
    collection_type: input.collectionType,
    address: input.address ?? null,
    status: "confirmed",
    total_amount: total,
    sample_id: sampleId,
    barcode,
    tests: tests.map((test: any) => ({ id: test.id, name: test.name, price: Number(test.price) })),
    created_at: new Date(),
    updated_at: new Date(),
  };

  await bookings.insertOne(booking);
  await bookingTests.insertMany(
    tests.map((test: any) => ({
      id: uuid(),
      booking_id: bookingId,
      test_id: test.id,
      price_at_booking: Number(test.price),
    }))
  );

  const sample = {
    id: sampleId,
    booking_id: bookingId,
    patient_id: patientId,
    barcode,
    status: "collected",
    collected_by: patientId,
    collected_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.collection("samples").insertOne(sample);
  await db.collection("sample_status_log").insertOne({
    id: uuid(),
    sample_id: sampleId,
    status: "collected",
    changed_by: patientId,
    note: input.collectionType === "home" ? "Home specimen collection scheduled" : "Laboratory walk-in check-in registered",
    changed_at: new Date(),
  });

  return booking;
}

export async function getBookingById(bookingId: string) {
  const booking = await getMongoDb().collection("bookings").findOne({ id: bookingId });
  if (!booking) throw ApiError.notFound("Booking not found");
  return booking;
}

export async function listBookingsForPatient(patientId: string) {
  const db = getMongoDb();
  const bookings = await db.collection("bookings")
    .find({ patient_id: patientId }, { projection: { _id: 0 } })
    .sort({ scheduled_at: -1 })
    .toArray();

  const bookingIds = bookings.map((b: any) => b.id);
  const [samples, reports] = await Promise.all([
    db.collection("samples").find({ booking_id: { $in: bookingIds } }).toArray(),
    db.collection("reports").find({ booking_id: { $in: bookingIds } }).toArray(),
  ]);

  const sampleMap = new Map(samples.map((s: any) => [s.booking_id, s]));
  const reportMap = new Map(reports.map((r: any) => [r.booking_id, r]));

  return bookings.map((b: any) => {
    const s = sampleMap.get(b.id) as any;
    const r = reportMap.get(b.id) as any;
    return {
      ...b,
      sample_id: s?.id || b.sample_id,
      barcode: s?.barcode || b.barcode,
      report_id: r?.id || null,
      report_status: r?.status || null,
    };
  });
}

export async function cancelBooking(bookingId: string, requestedBy: string, isAdmin = false) {
  const booking = await getMongoDb().collection("bookings").findOneAndUpdate(
    {
      id: bookingId,
      status: { $in: ["pending", "confirmed"] },
      ...(isAdmin ? {} : { patient_id: requestedBy }),
    },
    { $set: { status: "cancelled", updated_at: new Date() } },
    { returnDocument: "after" }
  );

  if (!booking) {
    throw ApiError.conflict("Booking cannot be cancelled at its current stage");
  }
  return booking;
}
