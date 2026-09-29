import { requireUser } from "@/lib/auth";
import { priorityQueue } from "@/lib/complaints";
import { AUTHORITY_ROLES } from "@/lib/enums";
import { parseQuery, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { priorityQuery } from "@/lib/validation";

/** GET /api/complaints/priority — open complaints ordered by priority score (authority only). */
export const GET = route(async (req) => {
  const actor = await requireUser(req, AUTHORITY_ROLES);
  return ok(await priorityQueue(actor, parseQuery(req, priorityQuery)));
});
