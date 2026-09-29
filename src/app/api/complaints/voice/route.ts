import { requireUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/http";
import { storeUpload } from "@/lib/uploads";

/**
 * POST /api/complaints/voice (multipart, field `file`) — PARTIAL.
 * The audio is validated and stored, but no speech-to-text provider is integrated yet
 * (docs/09 §2.3, provider still "proposed"), so this always answers 503 STT_UNAVAILABLE.
 * The stored `upload_id` is returned in `error.details` so the client can fall back to text.
 */
export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const media = await storeUpload(req, actor, "AUDIO");
  throw new ApiError(
    503,
    "STT_UNAVAILABLE",
    "Speech-to-text is not configured; audio was stored. Please type your complaint instead.",
    true,
    { upload_id: media.id },
  );
});
