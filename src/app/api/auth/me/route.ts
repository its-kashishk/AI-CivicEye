import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { currentUser } from "@/lib/users";

/** GET /api/auth/me — the authenticated user (role + department). */
export const GET = route(async (req) => {
  const actor = await requireUser(req);
  return ok(await currentUser(actor));
});
