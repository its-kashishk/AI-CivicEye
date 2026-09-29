// ============================================================================
// MOCK ML ADAPTER — NOT A REAL MODEL.
// Deterministic keyword/rule stub so the backend can be integration-tested before the real
// ML service exists. Its outputs are NOT predictions of a trained model, carry no accuracy
// claim, and are always tagged provider = 'MOCK' (stored in ai_analysis.provider and shown
// to API consumers as `mock: true`). Replace with HttpMlClient by setting ML_SERVICE_URL.
// The priority formula follows the *provisional, unvalidated* framework in docs/13.
// ============================================================================
import type { Category, PriorityLevel, Severity } from "@/lib/enums";
import { haversineMeters } from "@/lib/geo";
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

const CATEGORY_KEYWORDS: Record<Exclude<Category, "OTHER">, string[]> = {
  POTHOLE_ROAD_DAMAGE: ["pothole", "road hole", "hole in the road", "road damage", "damaged road", "broken road", "crack"],
  GARBAGE: ["garbage", "trash", "waste", "dump", "litter", "rubbish"],
  DRAINAGE_WATERLOGGING: ["drain", "waterlogging", "water logging", "flood", "sewage", "sewer", "manhole", "clogged"],
  STREETLIGHT_FAILURE: ["streetlight", "street light", "lamp post", "light not working", "dark street"],
  FALLEN_TREE: ["fallen tree", "tree fell", "tree fallen", "uprooted", "fallen branch", "branch fell"],
  WATER_LEAKAGE: ["leak", "pipe burst", "burst pipe", "water pipe", "no water supply"],
};

const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
const SEVERITY_ORDER: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ORDINAL: Record<Severity, number> = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, CRITICAL: 1 };

// Provisional, NOT validated (docs/13 §3). Sum = 1.
const WEIGHTS = { s: 0.35, c: 0.2, u: 0.15, l: 0.15, d: 0.1, k: 0.05 } as const;

function tokens(text: string | null): Set<string> {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097f]+/)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export class MockMlClient implements MlClient {
  readonly provider = "MOCK" as const;

  async classifyText({ text, categoryHint }: { text: string; categoryHint?: Category | null }): Promise<TextClassification> {
    const lower = text.toLowerCase();
    const scored = (Object.keys(CATEGORY_KEYWORDS) as Exclude<Category, "OTHER">[])
      .map((category) => ({
        category,
        hits: CATEGORY_KEYWORDS[category].filter((k) => lower.includes(k)).length,
      }))
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    if (scored.length === 0) {
      if (categoryHint) {
        return { category: categoryHint, confidence: 0.4, candidates: [{ category: categoryHint, confidence: 0.4 }] };
      }
      return { category: "OTHER", confidence: 0.3, candidates: [{ category: "OTHER", confidence: 0.3 }] };
    }
    const conf = (hits: number) => Math.min(0.8, 0.5 + 0.1 * hits);
    const candidates = scored.map((s) => ({ category: s.category, confidence: conf(s.hits) }));
    return { category: candidates[0].category, confidence: candidates[0].confidence, candidates };
  }

  // The mock has no vision model, so it declines instead of inventing a CV result.
  async classifyImage(): Promise<ImageClassification | null> {
    return null;
  }

  async predictSeverity({ text, urgency, similar_count }: SeverityRequest): Promise<SeverityResult> {
    const lower = (text ?? "").toLowerCase();
    const has = (words: string[]) => words.some((w) => lower.includes(w));
    let level: Severity = "MEDIUM";
    if (has(["died", "death", "fatal", "collapsed", "electrocut", "live wire"])) level = "CRITICAL";
    else if (has(["accident", "injur", "fell", "children", "school", "hospital", "huge", "danger", "overflow", "several people"])) level = "HIGH";
    else if (has(["small", "minor"])) level = "LOW";
    if (similar_count >= 5 && SEVERITY_RANK[level] < SEVERITY_RANK.HIGH) level = "HIGH";
    if (urgency && SEVERITY_RANK[urgency] > SEVERITY_RANK[level]) level = urgency;
    return { severity: level, confidence: 0.5 };
  }

  async findDuplicates(req: DuplicateRequest): Promise<DuplicateResult> {
    const mine = tokens(req.text);
    const hits: { id: string; score: number; reasons: string[] }[] = [];
    for (const c of req.candidates) {
      if (c.category && c.category !== req.category) continue;
      const score = jaccard(mine, tokens(c.text));
      const reasons = ["text_token_overlap(mock)", "same_category"];
      let needed = 0.6; // no location -> stricter text-only threshold
      if (req.lat != null && req.lng != null && c.lat != null && c.lng != null) {
        const d = haversineMeters(req.lat, req.lng, c.lat, c.lng);
        if (d > 200) continue;
        needed = 0.3;
        reasons.push(`geo<=${Math.max(10, Math.ceil(d / 10) * 10)}m`);
      }
      if (score >= needed) hits.push({ id: c.id, score: Math.round(score * 100) / 100, reasons });
    }
    hits.sort((a, b) => b.score - a.score);
    return {
      is_duplicate: hits.length > 0,
      similar_complaint_ids: hits.map((h) => h.id),
      similarity_scores: hits.map((h) => h.score),
      match_reasons: hits.length ? Array.from(new Set(hits.flatMap((h) => h.reasons))) : [],
    };
  }

  async computePriority(r: PriorityRequest): Promise<PriorityResult> {
    const s = ORDINAL[r.severity];
    const c = Math.min(1, Math.log(Math.max(1, r.cluster_size)) / Math.log(20));
    const u = r.urgency ? ORDINAL[r.urgency] : 0;
    const l = r.location_impact ?? 0;
    const d = Math.min(1, Math.max(0, r.persistence_days) / 14);
    const k = Math.min(1, Math.max(0, r.confidence));
    const raw = 100 * (WEIGHTS.s * s + WEIGHTS.c * c + WEIGHTS.u * u + WEIGHTS.l * l + WEIGHTS.d * d + WEIGHTS.k * k);
    const score = Math.max(0, Math.min(100, Math.round(raw)));
    const level: PriorityLevel = score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
    const reasons = [`severity=${r.severity}`];
    if (r.cluster_size > 1) reasons.push(`${r.cluster_size} related complaints in cluster`);
    if (r.urgency) reasons.push(`citizen-reported urgency=${r.urgency}`);
    if (r.persistence_days >= 1) reasons.push(`issue persisted ${Math.floor(r.persistence_days)} day(s)`);
    if (r.location_impact == null) reasons.push("location impact unknown (not scored)");
    return {
      score,
      level,
      signals: { s, c, u, l, d, k },
      reasons,
      weights_version: "mock-v0-unvalidated",
    };
  }
}

export { SEVERITY_ORDER };
