import { asc } from "drizzle-orm";
import { db } from "@/db";
import { department } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
import { ok } from "@/lib/respond";

/** GET /api/departments — canonical departments and the categories they handle. */
export const GET = route(async (req) => {
  await requireUser(req);
  const rows = await db.select().from(department).orderBy(asc(department.name));
  return ok({
    items: rows.map((d) => ({ id: d.id, code: d.code, name: d.name, default_categories: d.defaultCategories })),
  });
});
