import { requireUser } from "@/lib/auth";
import { getComplaintHistory } from "@/lib/complaints";
import { paramId, route } from "@/lib/http";
import { ok } from "@/lib/respond";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/complaints/{id}/history — chronological status history. */
export const GET = route<Ctx>(async (req, ctx) => {
  const actor = await requireUser(req);
  return ok(await getComplaintHistory(actor, await paramId(ctx)));
});
