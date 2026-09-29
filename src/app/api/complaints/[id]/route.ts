import { requireUser } from "@/lib/auth";
import { getComplaintDetail, updateComplaint } from "@/lib/complaints";
import { paramId, parseJson, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { complaintPatch } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/complaints/{id} — full detail incl. AI analysis, priority and status history. */
export const GET = route<Ctx>(async (req, ctx) => {
  const actor = await requireUser(req);
  return ok(await getComplaintDetail(actor, await paramId(ctx)));
});

/**
 * PATCH /api/complaints/{id} — update complaint fields.
 * Owner/operator/admin: text, category_hint, urgency, location. Operator/admin: department_code
 * (assignment/routing), category (override). Authority: resolution_note (RESOLVED/CLOSED only).
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const actor = await requireUser(req);
  const id = await paramId(ctx);
  const patch = await parseJson(req, complaintPatch);
  return ok(await updateComplaint(actor, id, patch));
});
