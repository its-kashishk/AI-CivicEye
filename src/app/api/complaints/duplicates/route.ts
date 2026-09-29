import { requireUser } from "@/lib/auth";
import { duplicateClusters } from "@/lib/complaints";
import { AUTHORITY_ROLES } from "@/lib/enums";
import { parseQuery, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { pageQuery } from "@/lib/validation";

/** GET /api/complaints/duplicates — duplicate/similar complaint clusters (size > 1). */
export const GET = route(async (req) => {
  const actor = await requireUser(req, AUTHORITY_ROLES);
  return ok(await duplicateClusters(actor, parseQuery(req, pageQuery)));
});
