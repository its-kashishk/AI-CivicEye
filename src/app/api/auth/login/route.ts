import { parseJson, route } from "@/lib/http";
import { ok } from "@/lib/respond";
import { login } from "@/lib/users";
import { loginInput } from "@/lib/validation";

/** POST /api/auth/login — email + password -> bearer token. */
export const POST = route(async (req) => {
  const input = await parseJson(req, loginInput);
  return ok(await login(input));
});
