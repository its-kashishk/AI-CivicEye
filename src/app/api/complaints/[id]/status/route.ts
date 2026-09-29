import { requireUser } from "@/lib/auth";
import { updateStatus } from "@/lib/complaints";
import { AUTHORITY_ROLES } from "@/lib/enums";
import { paramId, parseJson, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { statusInput } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/complaints/{id}/status — lifecycle transition (authority only, dept-scoped). */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const actor = await requireUser(req, AUTHORITY_ROLES);
  const id = await paramId(ctx);
  const input = await parseJson(req, statusInput);
  return ok(await updateStatus(actor, id, input));
});
