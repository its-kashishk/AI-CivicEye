// Central runtime configuration. Everything is read lazily from process.env so that
// `next build` does not require secrets. No secret has a default value.

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getSecretKey(): string {
  const key = process.env.SECRET_KEY;
  if (!key || key.length < 16) {
    throw new Error("SECRET_KEY is required (min 16 chars). See .env.example.");
  }
  return key;
}

export const config = {
  tokenTtlSeconds: () => intEnv("TOKEN_TTL_SECONDS", 60 * 60 * 12),

  // ML integration
  mlMode: (): "mock" | "http" | "disabled" => {
    const explicit = process.env.ML_MODE;
    if (explicit === "mock" || explicit === "http" || explicit === "disabled") return explicit;
    return process.env.ML_SERVICE_URL ? "http" : "mock";
  },
  mlServiceUrl: () => process.env.ML_SERVICE_URL ?? "",
  mlTimeoutMs: () => intEnv("ML_TIMEOUT_MS", 8000),
  // Below this, a modality's category is not trusted (docs/10 §11) -> needs_review.
  categoryConfidenceThreshold: () => intEnv("CATEGORY_CONFIDENCE_THRESHOLD_PCT", 50) / 100,

  // Duplicate candidate retrieval (docs/12). Provisional values, not validated.
  duplicateWindowDays: () => intEnv("DUPLICATE_WINDOW_DAYS", 14),
  duplicateSearchRadiusM: () => intEnv("DUPLICATE_SEARCH_RADIUS_M", 500),

  // Uploads (docs/04 §7). Local-disk storage driver for MVP.
  uploadDir: () => process.env.UPLOAD_DIR ?? "./uploads",
  maxImageBytes: () => intEnv("MAX_IMAGE_BYTES", 10 * 1024 * 1024),
  maxAudioBytes: () => intEnv("MAX_AUDIO_BYTES", 10 * 1024 * 1024),
};
