import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { POST as create } from "@/app/api/complaints/route";
import { GET as getOne } from "@/app/api/complaints/[id]/route";
import { POST as uploadImage } from "@/app/api/complaints/image/route";
import { POST as uploadVoice } from "@/app/api/complaints/voice/route";
import { db } from "@/db";
import { complaintMedia } from "@/db/schema";
import { call, makeUser, mkReq, POTHOLE_TEXT, randomLocation } from "./helpers";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);

const form = (bytes: Buffer, name: string, type: string) => {
  const f = new FormData();
  f.append("file", new File([new Uint8Array(bytes)], name, { type }));
  return f;
};
const uploadImg = (token: string | undefined, f: FormData) => call(uploadImage, mkReq("/api/complaints/image", { token, form: f }));

afterEach(() => {
  delete process.env.MAX_IMAGE_BYTES;
});

describe("image upload", () => {
  it("requires authentication", async () => {
    expect((await uploadImg(undefined, form(PNG, "a.png", "image/png"))).status).toBe(401);
  });

  it("stores a valid image under a generated safe key and records metadata", async () => {
    const u = await makeUser();
    const r = await uploadImg(u.token, form(PNG, "../../evil name.png", "image/png"));
    expect(r.status).toBe(200);
    expect(r.body.upload_id).toBeTruthy();
    // Mock adapter has no CV -> no fabricated preview, an honest warning instead.
    expect(r.body.cv_preview).toBeNull();
    expect(r.body.warning).toBeTruthy();

    const [row] = await db.select().from(complaintMedia).where(eq(complaintMedia.id, r.body.upload_id));
    expect(row).toMatchObject({ type: "IMAGE", mime: "image/png", sizeBytes: PNG.length, uploadedBy: u.id, complaintId: null });
    expect(row.storageKey).toMatch(/^images\/[0-9a-f-]{36}\.png$/); // client filename never used
    expect(existsSync(path.join(process.env.UPLOAD_DIR!, row.storageKey))).toBe(true);
  });

  it("rejects unsupported types, forged content, empty, missing and oversize files", async () => {
    const u = await makeUser();
    expect((await uploadImg(u.token, form(Buffer.from("hello"), "a.txt", "text/plain"))).status).toBe(400);
    expect((await uploadImg(u.token, form(Buffer.from("not really a png at all"), "a.png", "image/png"))).status).toBe(400);
    expect((await uploadImg(u.token, form(JPEG, "a.png", "image/png"))).status).toBe(400); // mime/content mismatch
    expect((await uploadImg(u.token, form(Buffer.alloc(0), "a.png", "image/png"))).status).toBe(400);
    expect((await uploadImg(u.token, new FormData())).status).toBe(400);
    process.env.MAX_IMAGE_BYTES = "32";
    const big = await uploadImg(u.token, form(PNG, "a.png", "image/png"));
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("attaches an upload to a complaint exactly once and only for its uploader", async () => {
    const u = await makeUser();
    const other = await makeUser();
    const up = await uploadImg(u.token, form(JPEG, "a.jpg", "image/jpeg"));
    const media = [{ type: "IMAGE", upload_id: up.body.upload_id }];

    const stolen = await call(create, mkReq("/api/complaints", { token: other.token, body: { text: POTHOLE_TEXT, media } }));
    expect(stolen.status).toBe(400);

    const ok = await call(create, mkReq("/api/complaints", { token: u.token, body: { text: POTHOLE_TEXT, location: randomLocation(), media } }));
    expect(ok.status).toBe(201);
    const d = await call(getOne, mkReq(`/api/complaints/${ok.body.id}`, { token: u.token }), { id: ok.body.id });
    expect(d.body.media).toHaveLength(1);
    expect(d.body.media[0]).toMatchObject({ id: up.body.upload_id, type: "IMAGE", mime: "image/jpeg" });
    expect(d.body.media[0].storage_key).toBeUndefined(); // internal key never exposed

    const reuse = await call(create, mkReq("/api/complaints", { token: u.token, body: { text: POTHOLE_TEXT, media } }));
    expect(reuse.status).toBe(400);
  });

  it("an image-only complaint is saved and analysis is deferred (mock has no CV — nothing is fabricated)", async () => {
    const u = await makeUser();
    const up = await uploadImg(u.token, form(PNG, "a.png", "image/png"));
    const r = await call(create, mkReq("/api/complaints", { token: u.token, body: { media: [{ type: "IMAGE", upload_id: up.body.upload_id }] } }));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: "SUBMITTED", analysis_status: "PENDING", category: null });
  });
});

describe("voice upload (partial: storage only, no STT provider)", () => {
  it("stores audio and answers 503 STT_UNAVAILABLE with the upload_id", async () => {
    const u = await makeUser();
    const r = await call(uploadVoice, mkReq("/api/complaints/voice", { token: u.token, form: form(Buffer.alloc(128, 3), "v.webm", "audio/webm") }));
    expect(r.status).toBe(503);
    expect(r.body.error).toMatchObject({ code: "STT_UNAVAILABLE", retryable: true });
    const [row] = await db.select().from(complaintMedia).where(eq(complaintMedia.id, r.body.error.details.upload_id));
    expect(row).toMatchObject({ type: "AUDIO", mime: "audio/webm" });
  });

  it("rejects non-audio files and anonymous requests", async () => {
    const u = await makeUser();
    expect((await call(uploadVoice, mkReq("/api/complaints/voice", { token: u.token, form: form(PNG, "a.png", "image/png") }))).status).toBe(400);
    expect((await call(uploadVoice, mkReq("/api/complaints/voice", { form: form(Buffer.alloc(8, 1), "v.webm", "audio/webm") }))).status).toBe(401);
  });
});
