import { requireUser } from "@/lib/auth";
import { createComplaint, listComplaints } from "@/lib/complaints";
import { parseJson, parseQuery, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { complaintInput, listQuery } from "@/lib/validation";

/**
 * POST /api/complaints — create + persist a complaint and run the AI orchestration.
 * If the ML service is unavailable the complaint is still saved (status SUBMITTED,
 * analysis_status PENDING) — it is never lost.
 */
export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const input = await parseJson(req, complaintInput);
  return ok(await createComplaint(actor, input), 201);
});

/** GET /api/complaints — list/filter. Citizens only ever see their own complaints. */
export const GET = route(async (req) => {
  const actor = await requireUser(req);
  const q = parseQuery(req, listQuery);
  return ok(await listComplaints(actor, q));
});
