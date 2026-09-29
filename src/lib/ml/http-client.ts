// HTTP client for the (separately developed) FastAPI ML service, following the internal
// endpoints proposed in docs/03. STATUS: implemented against the documented contract but
// NOT yet exercised against a real ML service (none exists at this time). Any network,
// timeout, status or schema problem is surfaced as MlUnavailableError so the backend can
// fail safe (docs/04 §8).
import { z } from "zod";
import { config } from "@/lib/config";
import { CATEGORIES, PRIORITY_LEVELS, SEVERITIES } from "@/lib/enums";
import type {
  DuplicateRequest,
  DuplicateResult,
  ImageClassification,
  MlClient,
  PriorityRequest,
  PriorityResult,
  SeverityRequest,
  SeverityResult,
  TextClassification,
} from "@/lib/ml/types";
import { MlUnavailableError } from "@/lib/ml/types";
import { storage } from "@/lib/storage";

const category = z.enum(CATEGORIES);
const conf = z.number().min(0).max(1);

const textSchema = z.object({
  category,
  confidence: conf,
  candidates: z.array(z.object({ category, confidence: conf })).default([]),
});
const imageSchema = z.object({ category, confidence: conf, boxes: z.array(z.unknown()).optional() });
const duplicateSchema = z.object({
  is_duplicate: z.boolean(),
  similar_complaint_ids: z.array(z.string()).default([]),
  similarity_scores: z.array(z.number()).default([]),
  match_reasons: z.array(z.string()).default([]),
});
const severitySchema = z.object({ severity: z.enum(SEVERITIES), confidence: conf });
// docs/03 ML-05 names the fields priority_score/priority_level; docs/07 exposes score/level.
const prioritySchema = z.object({
  priority_score: z.number().min(0).max(100),
  priority_level: z.enum(PRIORITY_LEVELS),
  signals: z.record(z.string(), z.number()).optional(),
  reasons: z.array(z.string()).default([]),
  weights_version: z.string().default("unknown"),
});

export class HttpMlClient implements MlClient {
  readonly provider = "HTTP" as const;

  private async call<T extends z.ZodType>(path: string, schema: T, init: RequestInit): Promise<z.infer<T>> {
    const base = config.mlServiceUrl().replace(/\/$/, "");
    if (!base) throw new MlUnavailableError("ML_SERVICE_URL is not configured");
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(config.mlTimeoutMs()) });
    } catch (e) {
      throw new MlUnavailableError(`ML request failed: ${(e as Error).message}`);
    }
    if (!res.ok) throw new MlUnavailableError(`ML service responded ${res.status}`);
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new MlUnavailableError("ML service returned invalid JSON");
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new MlUnavailableError("ML service returned an unexpected response shape");
    return parsed.data;
  }

  private postJson<T extends z.ZodType>(path: string, schema: T, body: unknown) {
    return this.call(path, schema, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  classifyText(input: { text: string; categoryHint?: DuplicateRequest["category"] | null }): Promise<TextClassification> {
    return this.postJson("/ml/classify/text", textSchema, { text: input.text, category_hint: input.categoryHint ?? null });
  }

  async classifyImage(input: { storageKey: string; mime: string }): Promise<ImageClassification | null> {
    let data: Buffer;
    try {
      data = await storage.get(input.storageKey);
    } catch {
      throw new MlUnavailableError("Image not readable from storage");
    }
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(data)], { type: input.mime }), "image");
    return this.call("/ml/classify/image", imageSchema, { method: "POST", body: form });
  }

  findDuplicates(input: DuplicateRequest): Promise<DuplicateResult> {
    return this.postJson("/ml/duplicates", duplicateSchema, {
      text: input.text,
      category: input.category,
      location: input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : null,
      created_at: input.createdAt.toISOString(),
      candidates: input.candidates.map((c) => ({
        id: c.id,
        text: c.text,
        category: c.category,
        cluster_id: c.clusterId,
        created_at: c.createdAt.toISOString(),
        location: c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null,
      })),
    });
  }

  predictSeverity(input: SeverityRequest): Promise<SeverityResult> {
    return this.postJson("/ml/severity", severitySchema, input);
  }

  async computePriority(input: PriorityRequest): Promise<PriorityResult> {
    const r = await this.postJson("/ml/priority", prioritySchema, input);
    return {
      score: Math.round(r.priority_score),
      level: r.priority_level,
      signals: r.signals ?? {},
      reasons: r.reasons,
      weights_version: r.weights_version,
    };
  }
}
