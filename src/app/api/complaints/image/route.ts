import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { route } from "@/lib/http";
import { getMlClient } from "@/lib/ml";
import { ok } from "@/lib/respond";
import { storeUpload } from "@/lib/uploads";

/**
 * POST /api/complaints/image (multipart, field `file`) — stores image evidence and returns
 * an `upload_id` to reference from POST /api/complaints. `cv_preview` is null (with a
 * `warning`) when CV is unavailable / low-confidence; the upload itself still succeeds.
 */
export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const media = await storeUpload(req, actor, "IMAGE");

  let cv_preview: { category: string; confidence: number } | null = null;
  let warning: string | undefined;
  try {
    const r = await getMlClient().classifyImage({ storageKey: media.storageKey, mime: media.mime });
    if (!r) {
      warning = "Image analysis is not available; please add a text description.";
    } else if (r.confidence < config.categoryConfidenceThreshold()) {
      warning = "Image not confidently recognised as a supported civic issue; please add a text description.";
    } else {
      cv_preview = { category: r.category, confidence: r.confidence };
    }
  } catch {
    warning = "Image analysis is temporarily unavailable; you can still submit your complaint.";
  }
  return ok({ upload_id: media.id, cv_preview, ...(warning ? { warning } : {}) });
});
