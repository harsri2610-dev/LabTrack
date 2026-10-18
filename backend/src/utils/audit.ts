import { v4 as uuid } from "uuid";
import { ClientSession } from "mongodb";
import { getMongoDb } from "../config/mongo";

interface AuditEntry {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  const auditEntry = {
    id: uuid(),
    actor_id: entry.actorId ?? null,
    action: entry.action,
    resource: entry.resource,
    resource_id: entry.resourceId ?? null,
    ip_address: entry.ipAddress ?? null,
    metadata: entry.metadata ?? {},
    created_at: new Date(),
  };
  const auditLogs = getMongoDb().collection("audit_logs");
  if (session) {
    await auditLogs.insertOne(auditEntry, { session });
  } else {
    await auditLogs.insertOne(auditEntry);
  }
}
