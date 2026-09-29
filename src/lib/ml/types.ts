// ML integration contract — mirrors docs/03 "ML Service Contract Summary".
// The backend only depends on this interface; the real FastAPI service (HttpMlClient) or
// the mock adapter (MockMlClient) can be swapped without touching orchestration code.
import type { Category, PriorityLevel, Severity } from "@/lib/enums";

export class MlUnavailableError extends Error {
  constructor(message = "ML service unavailable") {
    super(message);
    this.name = "MlUnavailableError";
  }
}

export interface TextClassification {
  category: Category;
  confidence: number; // 0..1
  candidates: { category: Category; confidence: number }[];
}

export interface ImageClassification {
  category: Category;
  confidence: number; // 0..1
  boxes?: unknown[];
}

export interface DuplicateCandidate {
  id: string;
  text: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: Date;
  category: Category | null;
  clusterId: string | null;
}

export interface DuplicateRequest {
  text: string | null;
  category: Category;
  lat: number | null;
  lng: number | null;
  createdAt: Date;
  /** Recent same-category complaints supplied by the backend (may be ignored by a real ML index). */
  candidates: DuplicateCandidate[];
}

export interface DuplicateResult {
  is_duplicate: boolean;
  similar_complaint_ids: string[];
  similarity_scores: number[];
  match_reasons: string[];
}

export interface SeverityRequest {
  category: Category;
  text: string | null;
  urgency: Severity | null;
  similar_count: number;
}

export interface SeverityResult {
  severity: Severity;
  confidence: number;
}

export interface PriorityRequest {
  severity: Severity;
  urgency: Severity | null;
  cluster_size: number;
  persistence_days: number;
  /** null = unknown (backend has no location-impact source yet). */
  location_impact: number | null;
  confidence: number;
}

export interface PriorityResult {
  score: number; // 0..100
  level: PriorityLevel;
  signals: Record<string, number>;
  reasons: string[];
  weights_version: string;
}

export interface MlClient {
  /** 'MOCK' = rule-based stub, NOT a trained model. 'HTTP' = real ML service. */
  readonly provider: "MOCK" | "HTTP";
  classifyText(input: { text: string; categoryHint?: Category | null }): Promise<TextClassification>;
  /** Returns null when this provider has no CV capability (never fabricates a prediction). */
  classifyImage(input: { storageKey: string; mime: string }): Promise<ImageClassification | null>;
  findDuplicates(input: DuplicateRequest): Promise<DuplicateResult>;
  predictSeverity(input: SeverityRequest): Promise<SeverityResult>;
  computePriority(input: PriorityRequest): Promise<PriorityResult>;
}
