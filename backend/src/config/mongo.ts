import { ClientSession, Db, MongoClient } from "mongodb";
import { env } from "./env";

let client: MongoClient | undefined;
let db: Db | undefined;

async function initializeMongoDb(database: Db): Promise<void> {
  await Promise.all([
    database.collection("users").createIndex({ id: 1 }, { unique: true }),
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("users").createIndex(
      { phone: 1 },
      { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
    ),
    database.collection("admin_bootstrap").createIndex({ id: 1 }, { unique: true }),
    database.collection("patients").createIndex({ user_id: 1 }, { unique: true }),
    database.collection("doctors").createIndex({ user_id: 1 }, { unique: true }),
    database.collection("doctors").createIndex(
      { registration_no: 1 },
      { unique: true, partialFilterExpression: { registration_no: { $type: "string" } } }
    ),
    database.collection("refresh_tokens").createIndex({ id: 1 }, { unique: true }),
    database.collection("refresh_tokens").createIndex({ token_hash: 1 }, { unique: true }),
    database.collection("refresh_tokens").createIndex({ user_id: 1 }),
    database.collection("test_catalog").createIndex({ id: 1 }, { unique: true }),
    database.collection("test_catalog").createIndex({ is_active: 1, category: 1, name: 1 }),
    database.collection("bookings").createIndex({ id: 1 }, { unique: true }),
    database.collection("bookings").createIndex({ patient_id: 1, scheduled_at: -1 }),
    database.collection("booking_tests").createIndex({ id: 1 }, { unique: true }),
    database.collection("booking_tests").createIndex({ booking_id: 1 }),
    database.collection("samples").createIndex({ id: 1 }, { unique: true }),
    database.collection("samples").createIndex({ barcode: 1 }, { unique: true }),
    database.collection("samples").createIndex({ booking_id: 1 }),
    database.collection("sample_status_log").createIndex({ id: 1 }, { unique: true }),
    database.collection("sample_status_log").createIndex({ sample_id: 1, changed_at: 1 }),
    database.collection("reports").createIndex({ id: 1 }, { unique: true }),
    database.collection("reports").createIndex({ booking_id: 1 }),
    database.collection("reports").createIndex({ patient_id: 1, status: 1 }),
    database.collection("doctor_patient_access").createIndex({ id: 1 }, { unique: true }),
    database.collection("doctor_patient_access").createIndex(
      { doctor_id: 1, patient_id: 1 },
      { unique: true }
    ),
    database.collection("doctor_patient_access").createIndex({ patient_id: 1, revoked: 1 }),
    database.collection("notifications").createIndex({ id: 1 }, { unique: true }),
    database.collection("notifications").createIndex({ user_id: 1, created_at: -1 }),
    database.collection("audit_logs").createIndex({ id: 1 }, { unique: true }),
    database.collection("audit_logs").createIndex({ actor_id: 1 }),
    database.collection("audit_logs").createIndex({ resource: 1, resource_id: 1 }),
    database.collection("face_biometrics").createIndex({ user_id: 1 }, { unique: true }),
    database.collection("face_biometrics").createIndex({ email: 1 }, { unique: true }),
  ]);
}

export async function connectMongo(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoClient = new MongoClient(env.mongoUri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db(env.mongoDbName);
  try {
    await initializeMongoDb(mongoDb);
  } catch (error) {
    await mongoClient.close();
    throw error;
  }
  client = mongoClient;
  db = mongoDb;
  return db;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

export function getMongoDb(): Db {
  if (!db) {
    throw new Error("MongoDB connection has not been initialized. Call connectMongo() first.");
  }
  return db;
}

export async function withMongoTransaction<T>(
  operation: (database: Db, session: ClientSession) => Promise<T>
): Promise<T> {
  if (!client || !db) {
    throw new Error("MongoDB connection has not been initialized. Call connectMongo() first.");
  }

  const session = client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await operation(db!, session);
      return result;
    });
    return result;
  } finally {
    await session.endSession();
  }
}
