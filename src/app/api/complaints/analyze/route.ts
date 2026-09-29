import { requireUser } from "@/lib/auth";
import { previewAnalysis } from "@/lib/complaints";
import { parseJson, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { complaintInput } from "@/lib/validation";

/** POST /api/complaints/analyze — AI analysis preview. Nothing is persisted. */
export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const input = await parseJson(req, complaintInput);
  return ok(await previewAnalysis(actor, input));
});
