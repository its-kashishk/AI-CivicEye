# 18 — Risks & Limitations

**Project:** AI CivicEye
**Status:** `[PROPOSED]`. Honest accounting of risks. **AI is never assumed to be always correct.**

---

## 1. Data Risks
| Risk | Description | Mitigation |
| --- | --- | --- |
| Synthetic BMC dataset | Dataset A is **synthetically generated**, not real citizen records; may not reflect real noise/distribution | Treat as prototyping data; validate on a small real/gold set; label as synthetic everywhere |
| Domain mismatch | Text dataset (BMC) vs image datasets (road) come from different domains/regions | Keep modalities loosely coupled; don't assume cross-dataset transfer |
| Unverified fields | Column/label availability not yet inspected | `[REQUIRES VERIFICATION]`; inspect before modeling |
| License uncertainty | Dataset licenses `[REQUIRES VERIFICATION]` | Confirm terms before training/redistribution |
| Data leakage | Improper splits inflate metrics | Split before fitting; dedup across splits; fixed seeds |

## 2. Model Risks
| Risk | Description | Mitigation |
| --- | --- | --- |
| Limited CV classes | Verified data covers road damage only | Ship road-damage first; expand with new data; low-confidence → OTHER |
| False duplicate detection | Semantic matching may over/under-merge | Conservative thresholds; advisory-only; human confirm/merge/split |
| Incorrect severity | Severity labels may be derived/weak | Rule-based baseline; human review; clearly mark confidence |
| Priority mis-ranking | Weights **not validated** | Configurable + experimentally tuned; transparent reasons |
| Model confidence limits | High confidence ≠ correctness | Show confidence; thresholds; human-in-the-loop |
| Model bias | Data/geographic/language bias | Monitor per-class/area performance; document limitations |

## 3. Language & Input Risks
- English/Hindi/Hinglish variation may reduce NLP accuracy → multilingual handling + baselines.
- Poor-quality images/audio → quality checks, fallbacks to text.

## 4. Location Risks
- GPS/geocoding inaccuracy affects duplicate geo-gates and hotspots → allow manual correction; treat geo as one signal among many.

## 5. Privacy & Data Protection
- Complaints may contain PII (name/phone/photos of people).
- Mitigations: minimize collection, access control (RBAC), strip GPS EXIF option, redact PII where feasible, audit access. Compliance specifics `[REQUIRES VERIFICATION]`.

## 6. System Risks
- ML service downtime → complaint still saved, analysis deferred (fail-safe).
- Secret exposure → server-side only, never in client bundle.

## 7. Honest Disclaimers
- AI CivicEye is **decision-support**, not an autonomous authority.
- All example numbers (priority 91/100, "17 similar", "10 days") are **illustrative**, not real results.
- No accuracy/F1/latency/screenshots/dataset statistics are claimed until measured/verified.
