import { requireUser } from "@/lib/auth";
import { dashboardOverview } from "@/lib/dashboard";
import { AUTHORITY_ROLES } from "@/lib/enums";
import { route } from "@/lib/http";
import { ok } from "@/lib/respond";

/** GET /api/dashboard/overview — KPI + aggregate data (real data only; empty until data exists). */
export const GET = route(async (req) => {
  const actor = await requireUser(req, AUTHORITY_ROLES);
  return ok(await dashboardOverview(actor));
});
