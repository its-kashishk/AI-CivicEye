import { describe, expect, it } from "vitest";
import { hashPassword, signToken, verifyPassword, verifyToken } from "@/lib/auth";
import { COMPLAINT_STATUSES } from "@/lib/enums";
import { boundingBox, geohash, haversineMeters } from "@/lib/geo";
import { canManualTransition, MANUAL_TRANSITIONS } from "@/lib/lifecycle";
import { sniffImageMime } from "@/lib/uploads";

describe("lifecycle (docs/04 §3)", () => {
  it("defines transitions for every documented status and never allows system-only jumps manually", () => {
    for (const s of COMPLAINT_STATUSES) expect(MANUAL_TRANSITIONS[s]).toBeDefined();
    expect(canManualTransition("ROUTED", "ACKNOWLEDGED")).toBe(true);
    expect(canManualTransition("RESOLVED", "REOPENED")).toBe(true);
    expect(canManualTransition("SUBMITTED", "ANALYZED")).toBe(false);
    expect(canManualTransition("ANALYZED", "ROUTED")).toBe(false);
    expect(canManualTransition("ROUTED", "RESOLVED")).toBe(false);
    for (const terminal of ["CLOSED", "REJECTED", "DUPLICATE_MERGED"] as const) {
      expect(MANUAL_TRANSITIONS[terminal]).toEqual([]);
    }
  });
});

describe("geo", () => {
  it("encodes geohashes (reference value)", () => {
    expect(geohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(geohash(19.07, 72.87)).toHaveLength(7);
  });
  it("computes haversine distance and bounding boxes", () => {
    expect(haversineMeters(0, 0, 0, 0)).toBe(0);
    expect(haversineMeters(0, 0, 0, 1)).toBeGreaterThan(110_000);
    expect(haversineMeters(0, 0, 0, 1)).toBeLessThan(112_000);
    const b = boundingBox(19, 72, 500);
    expect(b.minLat).toBeLessThan(19);
    expect(b.maxLng).toBeGreaterThan(72);
  });
});

describe("auth primitives", () => {
  it("hashes with a random salt and verifies", async () => {
    const h1 = await hashPassword("correct horse");
    const h2 = await hashPassword("correct horse");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("correct horse", h1)).toBe(true);
    expect(await verifyPassword("wrong", h1)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("signs and verifies tokens; rejects tampering and expiry", () => {
    const { token } = signToken("11111111-1111-1111-1111-111111111111", "OPERATOR");
    expect(verifyToken(token)?.role).toBe("OPERATOR");
    const [h, , s] = token.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: "x", role: "ADMIN", iat: 0, exp: 9999999999 })).toString("base64url")}.${s}`;
    expect(verifyToken(forged)).toBeNull();
    expect(verifyToken(signToken("x", "CITIZEN", -1).token)).toBeNull();
    expect(verifyToken("a.b")).toBeNull();
  });
});

describe("upload sniffing", () => {
  it("recognises real image signatures only", () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(sniffImageMime(Buffer.from("RIFF\0\0\0\0WEBPxxxx"))).toBe("image/webp");
    expect(sniffImageMime(Buffer.from("plain text"))).toBeNull();
  });
});
