import { requireUser } from "@/lib/auth";
import { reanalyzeComplaint } from "@/lib/complaints";
import { AUTHORITY_ROLES } from "@/lib/enums";
import { paramId, route } from "@/lib/http";
import { ok } from "@/lib/respond";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/complaints/{id}/reanalyze — retries a deferred (PENDING/FAILED) AI analysis
 * (docs/04 §8 "retry async"). 409 if analysis already COMPLETED; 503 if ML still unavailable.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const actor = await requireUser(req, AUTHORITY_ROLES);
  return ok(await reanalyzeComplaint(actor, await paramId(ctx)));
});
