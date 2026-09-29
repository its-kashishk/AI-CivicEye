import { ok } from "@/lib/respond";
import { parseJson, route } from "@/lib/http";
import { registerCitizen } from "@/lib/users";
import { registerInput } from "@/lib/validation";

/** POST /api/auth/register — creates a CITIZEN account and returns a bearer token. */
export const POST = route(async (req) => {
  const input = await parseJson(req, registerInput);
  return ok(await registerCitizen(input), 201);
});
