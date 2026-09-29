// AI pipeline orchestration (docs/09): text/image -> fusion -> duplicates -> severity ->
// priority -> explanation. Pure w.r.t. the database: everything it needs from storage is
// passed in through `PipelineDeps`, so it is unit-testable and shared by the preview
// (`/analyze`, no persistence) and the persisting create/reanalyze flows.
import { config } from "@/lib/config";
import type { Category, PriorityLevel, Severity } from "@/lib/enums";
import {
  type DuplicateCandidate,
  type DuplicateResult,
  type MlClient,
  MlUnavailableError,
  type PriorityResult,
} from "@/lib/ml/types";

export interface PipelineInput {
  text: string | null;
  categoryHint: Category | null;
  urgency: Severity | null;
  lat: number | null;
  lng: number | null;
  createdAt: Date;
  /** Stored images attached to the complaint (first one is analysed). */
  images: { storageKey: string; mime: string }[];
  excludeComplaintId?: string;
}

export interface PipelineDeps {
  ml: MlClient;
  loadCandidates(args: {
    category: Category;
    lat: number | null;
    lng: number | null;
    createdAt: Date;
    excludeComplaintId?: string;
  }): Promise<DuplicateCandidate[]>;
  loadClusterContext(similarIds: string[]): Promise<{ clusterSize: number; firstReportedAt: Date | null }>;
}

export interface PipelineResult {
  provider: "MOCK" | "HTTP";
  category: Category;
  categoryConfidence: number;
  candidates: { category: Category; confidence: number }[];
  severity: Severity;
  severityConfidence: number;
  needsReview: boolean;
  cvResult: unknown | null;
  nlpResult: unknown | null;
  duplicates: DuplicateResult;
  clusterSize: number;
  priority: PriorityResult;
  explanation: string[];
  modelVersions: Record<string, unknown>;
}

// Provisional fusion boost when text and image agree (docs/09 §2.4: "boost confidence").
const AGREEMENT_BOOST = 0.05;

export function fuse(
  text: { category: Category; confidence: number } | null,
  cv: { category: Category; confidence: number } | null,
): { category: Category; confidence: number; agreed: boolean | null; note: string } | null {
  if (text && !cv) return { ...text, agreed: null, note: "category from text only" };
  if (cv && !text) return { ...cv, agreed: null, note: "category from image only" };
  if (!text || !cv) return null;
  if (text.category === cv.category) {
    return {
      category: text.category,
      confidence: Math.min(1, Math.max(text.confidence, cv.confidence) + AGREEMENT_BOOST),
      agreed: true,
      note: "text and image agree",
    };
  }
  const winner = cv.confidence > text.confidence ? cv : text;
  return {
    ...winner,
    agreed: false,
    note: `text (${text.category}) and image (${cv.category}) disagree; kept higher-confidence result`,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Throws MlUnavailableError when the analysis cannot be produced (caller must fail safe). */
export async function runPipeline(deps: PipelineDeps, input: PipelineInput): Promise<PipelineResult> {
  const { ml } = deps;
  const explanation: string[] = [];
  const threshold = config.categoryConfidenceThreshold();
  const text = input.text?.trim() ? input.text.trim() : null;
  let needsReview = false;

  // --- text stream -------------------------------------------------------------
  let textRes: Awaited<ReturnType<MlClient["classifyText"]>> | null = null;
  let textError: MlUnavailableError | null = null;
  if (text) {
    try {
      textRes = await ml.classifyText({ text, categoryHint: input.categoryHint });
    } catch (e) {
      if (!(e instanceof MlUnavailableError)) throw e;
      textError = e;
    }
  }

  // --- image stream ------------------------------------------------------------
  let cvRes: Awaited<ReturnType<MlClient["classifyImage"]>> = null;
  let cvError: MlUnavailableError | null = null;
  if (input.images[0]) {
    try {
      cvRes = await ml.classifyImage(input.images[0]);
    } catch (e) {
      if (!(e instanceof MlUnavailableError)) throw e;
      cvError = e;
    }
    if (cvRes && cvRes.confidence < threshold) {
      explanation.push(
        `Image result (${cvRes.category}) discarded: confidence ${cvRes.confidence.toFixed(2)} below threshold ${threshold.toFixed(2)}`,
      );
      needsReview = true;
      cvRes = null;
    }
  }
  if (textError) explanation.push("Text analysis was unavailable");
  if (cvError) explanation.push("Image analysis was unavailable; continuing without it");

  // --- fusion ------------------------------------------------------------------
  const fused = fuse(textRes, cvRes);
  if (!fused) {
    throw new MlUnavailableError(
      textError?.message ?? cvError?.message ?? "No modality could be analysed (no usable text/image result)",
    );
  }
  if (fused.agreed === false) needsReview = true;
  if (fused.confidence < threshold) needsReview = true;
  explanation.push(
    `Category ${fused.category} (confidence ${fused.confidence.toFixed(2)}): ${fused.note}`,
  );

  // --- duplicate detection (degrades gracefully) ---------------------------------
  let duplicates: DuplicateResult = {
    is_duplicate: false,
    similar_complaint_ids: [],
    similarity_scores: [],
    match_reasons: [],
  };
  try {
    const candidates = await deps.loadCandidates({
      category: fused.category,
      lat: input.lat,
      lng: input.lng,
      createdAt: input.createdAt,
      excludeComplaintId: input.excludeComplaintId,
    });
    duplicates = await ml.findDuplicates({
      text,
      category: fused.category,
      lat: input.lat,
      lng: input.lng,
      createdAt: input.createdAt,
      candidates,
    });
  } catch (e) {
    if (!(e instanceof MlUnavailableError)) throw e;
    explanation.push("Duplicate detection was unavailable");
  }
  const similarCount = duplicates.similar_complaint_ids.length;
  if (similarCount > 0) explanation.push(`${similarCount} similar complaint(s) detected`);

  // --- severity ----------------------------------------------------------------
  const sev = await ml.predictSeverity({
    category: fused.category,
    text,
    urgency: input.urgency,
    similar_count: similarCount,
  });
  explanation.push(`Severity ${sev.severity} (confidence ${sev.confidence.toFixed(2)})`);

  // --- priority ----------------------------------------------------------------
  const ctx = similarCount > 0 ? await deps.loadClusterContext(duplicates.similar_complaint_ids) : null;
  const clusterSize = ctx ? ctx.clusterSize : 1;
  const persistenceDays = ctx?.firstReportedAt
    ? Math.max(0, (input.createdAt.getTime() - ctx.firstReportedAt.getTime()) / DAY_MS)
    : 0;
  const priority = await ml.computePriority({
    severity: sev.severity,
    urgency: input.urgency,
    cluster_size: clusterSize,
    persistence_days: persistenceDays,
    location_impact: null,
    confidence: fused.confidence,
  });
  explanation.push(`Priority ${priority.score}/100 (${priority.level}) — ${priority.reasons.join("; ")}`);
  if (ml.provider === "MOCK") {
    explanation.unshift("[MOCK] Generated by a rule-based stub adapter, not a trained ML model.");
  }

  return {
    provider: ml.provider,
    category: fused.category,
    categoryConfidence: fused.confidence,
    candidates: textRes?.candidates ?? [],
    severity: sev.severity,
    severityConfidence: sev.confidence,
    needsReview,
    cvResult: cvRes,
    nlpResult: textRes,
    duplicates,
    clusterSize,
    priority,
    explanation,
    modelVersions: { provider: ml.provider, priority_weights_version: priority.weights_version },
  };
}

export type { PriorityLevel };
