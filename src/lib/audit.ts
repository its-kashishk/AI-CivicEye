import { db } from "@/db";
import { auditLog } from "@/db/schema";

/** Anything that can insert: the db client or a transaction handle. */
export type DbLike = Pick<typeof db, "insert">;

export async function writeAudit(
  tx: DbLike,
  entry: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string | null;
    payload?: unknown;
  },
) {
  await tx.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
    payload: entry.payload ?? null,
  });
}
