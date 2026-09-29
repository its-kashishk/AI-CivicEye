// Image / audio upload handling (docs/04 §7, docs/07 §3-4).
// Validates type + size, generates a safe server-side key (never uses the client filename),
// stores bytes via the storage driver and records metadata in complaint_media.
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { complaintMedia } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import type { Actor } from "@/lib/auth";
import { config } from "@/lib/config";
import type { MediaType } from "@/lib/enums";
import { Errors } from "@/lib/http";
import { storage } from "@/lib/storage";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

/** Verifies the real file signature so a renamed/forged file is rejected. */
export function sniffImageMime(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function storeUpload(req: Request, actor: Actor, kind: MediaType) {
  const max = kind === "IMAGE" ? config.maxImageBytes() : config.maxAudioBytes();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max + 1024 * 1024) throw Errors.tooLarge(`File exceeds the ${max} byte limit`);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw Errors.validation("Request must be multipart/form-data with a 'file' field");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw Errors.validation("Missing 'file' field");
  if (file.size === 0) throw Errors.validation("File is empty");
  if (file.size > max) throw Errors.tooLarge(`File exceeds the ${max} byte limit`);

  const allowed = kind === "IMAGE" ? IMAGE_TYPES : AUDIO_TYPES;
  const declaredMime = file.type.toLowerCase().split(";")[0].trim();
  const ext = allowed[declaredMime];
  if (!ext) {
    throw Errors.validation(`Unsupported ${kind.toLowerCase()} type '${file.type || "unknown"}'. Allowed: ${Object.keys(allowed).join(", ")}`);
  }

  const data = Buffer.from(await file.arrayBuffer());
  if (kind === "IMAGE") {
    const real = sniffImageMime(data);
    if (!real || real !== declaredMime) throw Errors.validation("File content does not match the declared image type");
  }

  const storageKey = `${kind === "IMAGE" ? "images" : "audio"}/${randomUUID()}.${ext}`;
  await storage.put(storageKey, data);
  try {
    const [row] = await db
      .insert(complaintMedia)
      .values({ uploadedBy: actor.id, type: kind, storageKey, mime: declaredMime, sizeBytes: data.length })
      .returning();
    await writeAudit(db, {
      entityType: "media",
      entityId: row.id,
      action: "MEDIA_UPLOAD",
      actorId: actor.id,
      payload: { type: kind, mime: declaredMime, sizeBytes: data.length },
    });
    return row;
  } catch (e) {
    await storage.remove(storageKey);
    throw e;
  }
}
