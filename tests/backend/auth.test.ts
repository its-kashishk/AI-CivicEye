import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as register } from "@/app/api/auth/register/route";
import { db } from "@/db";
import { citizen } from "@/db/schema";
import { signToken } from "@/lib/auth";
import { call, mkReq, short } from "./helpers";

const creds = () => ({ name: "Asha Test", email: `asha-${short()}@test.example`, password: "s3cret-pass" });

describe("auth API", () => {
  it("registers a citizen, returns a token, never returns the password hash", async () => {
    const c = creds();
    const r = await call(register, mkReq("/api/auth/register", { body: c }));
    expect(r.status).toBe(201);
    expect(r.body.user.role).toBe("CITIZEN");
    expect(r.body.user.email).toBe(c.email);
    expect(r.body.access_token).toBeTruthy();
    expect(JSON.stringify(r.body)).not.toContain("password");
  });

  it("stores only a scrypt hash, never the plain password", async () => {
    const c = creds();
    await call(register, mkReq("/api/auth/register", { body: c }));
    const [row] = await db.select().from(citizen).where(eq(citizen.email, c.email));
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(row.passwordHash).not.toContain(c.password);
  });

  it("ignores a client-supplied role (no privilege escalation via registration)", async () => {
    const r = await call(register, mkReq("/api/auth/register", { body: { ...creds(), role: "ADMIN" } }));
    expect(r.status).toBe(201);
    expect(r.body.user.role).toBe("CITIZEN");
  });

  it("rejects duplicate email with 409", async () => {
    const c = creds();
    await call(register, mkReq("/api/auth/register", { body: c }));
    const r = await call(register, mkReq("/api/auth/register", { body: c }));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CONFLICT");
  });

  it("validates registration input (400 with details)", async () => {
    const r = await call(register, mkReq("/api/auth/register", { body: { name: "", email: "nope", password: "short" } }));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_ERROR");
    expect(r.body.error.details.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects malformed JSON with 400", async () => {
    const r = await call(register, mkReq("/api/auth/register", { body: "{not json" }));
    expect(r.status).toBe(400);
  });

  it("logs in with correct credentials and rejects wrong ones identically", async () => {
    const c = creds();
    await call(register, mkReq("/api/auth/register", { body: c }));
    const ok = await call(login, mkReq("/api/auth/login", { body: { email: c.email, password: c.password } }));
    expect(ok.status).toBe(200);
    expect(ok.body.token_type).toBe("Bearer");

    const wrongPw = await call(login, mkReq("/api/auth/login", { body: { email: c.email, password: "wrong-password" } }));
    const unknown = await call(login, mkReq("/api/auth/login", { body: { email: `x-${short()}@test.example`, password: "whatever1" } }));
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body.error.message).toBe(unknown.body.error.message);
  });

  it("GET /me requires a valid token", async () => {
    const c = creds();
    const reg = await call(register, mkReq("/api/auth/register", { body: c }));
    const token = reg.body.access_token as string;

    const good = await call(me, mkReq("/api/auth/me", { token }));
    expect(good.status).toBe(200);
    expect(good.body.email).toBe(c.email);

    expect((await call(me, mkReq("/api/auth/me"))).status).toBe(401);
    expect((await call(me, mkReq("/api/auth/me", { token: token.slice(0, -3) + "abc" }))).status).toBe(401);
    const expired = signToken(reg.body.user.id, "CITIZEN", -10).token;
    expect((await call(me, mkReq("/api/auth/me", { token: expired }))).status).toBe(401);
  });

  it("disabled accounts cannot use existing tokens", async () => {
    const c = creds();
    const reg = await call(register, mkReq("/api/auth/register", { body: c }));
    await db.update(citizen).set({ isActive: false }).where(eq(citizen.id, reg.body.user.id));
    const r = await call(me, mkReq("/api/auth/me", { token: reg.body.access_token }));
    expect(r.status).toBe(401);
  });
});
