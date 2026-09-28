# 03 — Machine Learning PRD

**Project:** AI CivicEye
**Status:** `[PROPOSED]` / `[PLANNED]`. No models are trained, exported, or evaluated in this task. **No metrics are claimed.**

This document specifies the ML modules, their inputs/outputs, and their contracts with the backend. The ML service is a **Python + FastAPI** microservice (see `01_MASTER_ARCHITECTURE.md`). Outputs here MUST match the API in `07_API_CONTRACT.md` and the DB in `08_DATABASE_SCHEMA.md`.

---

## 0. Canonical Enumerations (must match everywhere)

- **Categories:** `POTHOLE_ROAD_DAMAGE`, `GARBAGE`, `DRAINAGE_WATERLOGGING`, `STREETLIGHT_FAILURE`, `FALLEN_TREE`, `WATER_LEAKAGE`, `OTHER`
- **Severity:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **Priority level:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` + score `0–100`

> Final class support depends on **verified** datasets. Not all categories are guaranteed to be supported by every model at MVP.

---

## ML-01 — Civic Issue Classification `[PROPOSED]`

**Purpose:** Assign a civic category to a complaint.

**Inputs**
- Complaint text (required for text-only)
- Optional CV result (category + confidence from image)
- Optional metadata (location context, citizen-reported category)

**Outputs**
```json
{ "category": "POTHOLE_ROAD_DAMAGE", "confidence": 0.0, "candidates": [{"category": "GARBAGE", "confidence": 0.0}] }
```

**Initial candidate categories:** the 7 canonical categories above. Final supported classes depend on verified training data; unsupported inputs map to `OTHER` with low confidence.

**Approach (candidate):** baseline TF-IDF + linear classifier → upgrade to sentence-embedding classifier or fine-tuned transformer. See `11_NLP_MODULE.md`.

**Fusion with CV:** when both text and image exist, the backend/ML fuses results (see `09_AI_PIPELINE.md` §Fusion). Simple rule: prefer the higher-confidence modality; if they agree, boost confidence; if they disagree, keep both as candidates and flag for review.

---

## ML-02 — Computer Vision `[PROPOSED]`

**Purpose:** Image → civic issue classification/detection.

**MVP candidate classes:** `POTHOLE_ROAD_DAMAGE`, `GARBAGE`, `DRAINAGE_WATERLOGGING` (waterlogging), `FALLEN_TREE`.

**Pipeline**
1. **Preprocessing:** resize, normalize, EXIF-orient, optional denoise.
2. **Augmentation (train):** flips, rotation, brightness/contrast jitter, random crop, (optional) weather/occlusion sim.
3. **Training:** transfer learning from pretrained backbone; class-balanced sampling.
4. **Validation:** held-out split; early stopping on validation metric.
5. **Inference:** single image → class + confidence (+ boxes if detection).
6. **Confidence threshold:** below threshold → `OTHER` / "needs human review".
7. **Unsupported image handling:** non-civic / blurry / off-topic images → low-confidence `OTHER`, prompt user to add text.

**Candidate architectures (label: candidate, not selected):**
| Model | Task type | Notes |
| --- | --- | --- |
| YOLO (v8/11) | Detection | Localizes multiple defects; heavier |
| MobileNet | Classification | Lightweight, edge-friendly |
| EfficientNet | Classification | Good accuracy/size tradeoff |
| ResNet | Classification | Strong baseline |

**Metrics (to be measured, not claimed):** accuracy, precision, recall, F1, confusion matrix (classification); mAP, IoU, precision, recall (detection/segmentation). See `10_CV_MODULE.md`. Use `[Insert model evaluation results after training]`.

---

## ML-03 — Duplicate Complaint Detection `[PROPOSED]`

**Signals:** complaint text + location + time + category.

**Method:** text → embeddings → similarity; combine with geographic proximity, temporal proximity, and category compatibility → nearest-neighbor / clustering.

**Why semantic > exact string match:**
- "Pothole near XYZ road" vs "Large road hole near XYZ" share **meaning** but few exact tokens.
- Exact/keyword matching misses paraphrases, typos, and multilingual variants.
- Embeddings capture semantic closeness so related reports cluster together.

**Output**
```json
{ "is_duplicate": true, "cluster_id": "uuid", "similar_complaint_ids": ["..."], "similarity_scores": [0.0], "match_reasons": ["semantic", "geo<50m", "same_category"] }
```
Full design in `12_DUPLICATE_DETECTION.md`.

---

## ML-04 — Severity Prediction `[PROPOSED]`

**Candidate features:** issue category, complaint text signals, citizen-reported urgency, number of similar complaints, location context, duration/persistence, historical patterns.

**Outputs:** `LOW` | `MEDIUM` | `HIGH` | `CRITICAL` (+ confidence).

> **Important:** These severity labels are **not** assumed to exist in the dataset. `[REQUIRES VERIFICATION]` whether the BMC dataset contains a usable severity/urgency field.

**Labeling strategy if labels are absent `[PLANNED]`:**
- Derive weak labels from proxy fields (e.g., resolution time, category rules, keywords like "accident/injury/overflow").
- Manually label a small gold set for evaluation.
- Start with a **rule-based severity baseline**, then train a model if labeled data is sufficient.

---

## ML-05 — Priority Engine `[PROPOSED]`

An **explainable, configurable** scoring framework — not a black box.

**Candidate signals & default weights (illustrative — NOT validated):**
| Signal | Symbol | Default weight |
| --- | --- | --- |
| Severity | `s` | 0.35 |
| Affected-citizen / cluster size | `c` | 0.20 |
| Citizen-reported urgency | `u` | 0.15 |
| Location impact (e.g., near school/hospital/main road) | `l` | 0.15 |
| Persistence / duration | `d` | 0.10 |
| Model confidence adjustment | `k` | 0.05 |

`priority_score = 100 * Σ(weight_i * normalized_signal_i)` → map to level thresholds (e.g., ≥75 CRITICAL, ≥50 HIGH, ≥25 MEDIUM, else LOW). **Thresholds & weights are placeholders and MUST be evaluated experimentally.**

**Output**
```json
{ "priority_score": 0, "priority_level": "HIGH", "reasons": ["severity=HIGH", "cluster_size=17", "persisted 10 days"], "weights_version": "v0" }
```
Full design in `13_PRIORITY_ENGINE.md`.

> Weights are **not scientifically validated**. They are a configurable starting point to be tuned/evaluated.

---

## ML-06 — Explainability `[PROPOSED]`

Every AI decision must expose understandable reasons.

Example:
```
High priority because:
- severity = HIGH
- 17 similar complaints detected (illustrative)
- issue persisted for 10 days (illustrative)
```

**Techniques (where appropriate):**
- Priority: transparent per-signal contribution breakdown (inherently interpretable).
- NLP classifier: feature attributions (e.g., token importance) or nearest training examples.
- CV: saliency/Grad-CAM style visual explanation `[PLANNED]`.
- Duplicate: show matched text + geo/temporal reasons.

> Numbers in examples are **illustrative**, never presented as real model output.

---

## ML Service Contract Summary

| Module | Endpoint (internal) `[PROPOSED]` | Returns |
| --- | --- | --- |
| ML-01 | `POST /ml/classify/text` | category, confidence, candidates |
| ML-02 | `POST /ml/classify/image` | category, confidence, boxes? |
| ML-03 | `POST /ml/duplicates` | cluster, similar ids, reasons |
| ML-04 | `POST /ml/severity` | severity, confidence |
| ML-05 | `POST /ml/priority` | score, level, reasons |
| ML-06 | (embedded in each) | reasons/explanations |

The backend orchestrates these and persists results (see `04_BACKEND_PRD.md`, `09_AI_PIPELINE.md`).
