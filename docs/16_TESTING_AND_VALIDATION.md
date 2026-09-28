# 16 — Testing & Validation

**Project:** AI CivicEye
**Status:** `[PLANNED]`. Test strategy for the implementation phase. No tests written yet.

---

## 1. Test Layers

| Layer | Scope | Tools (candidate) |
| --- | --- | --- |
| Unit | pure functions, priority math, routing rules | Vitest/Jest (JS), pytest (ML) |
| API | route handlers, validation, auth, errors | supertest / HTTP tests |
| ML | model I/O shape, thresholds, determinism | pytest |
| CV | preprocessing, inference contract | pytest |
| NLP | preprocessing, classifier/embedding output | pytest |
| Integration | full pipeline via mock/real ML | e2e harness |
| Frontend | components, states, flows | React Testing Library / Playwright |
| Security | authz, secret exposure, upload limits | manual + automated |

## 2. What to Test per Module
- **Priority engine:** score bounds 0–100, weight config changes, threshold→level mapping, reasons present.
- **Duplicate detection:** gates applied, threshold behavior, no auto-delete, cluster updates.
- **Routing:** category→department mapping, override audit.
- **Backend:** lifecycle transitions valid/invalid, RBAC enforcement, audit entries created.
- **ML contracts:** output JSON matches `07_API_CONTRACT.md`.

## 3. Edge Cases (must fail safely)

| Case | Expected behavior |
| --- | --- |
| Blurry image | quality warning; low-confidence; ask retake/text; still submittable |
| Unsupported image (non-civic) | `OTHER` low confidence; prompt add text |
| Empty complaint | validation error; no crash |
| Ambiguous complaint | multiple candidates; `needs_review` flag |
| Duplicate complaint | attach to cluster; advisory only |
| Incorrect location | allow manual correction |
| Missing location | allow submit; reduced geo signals |
| Low-confidence prediction | mark review; don't over-trust |
| Backend service degraded | standard error envelope; retryable |
| ML service unavailable | persist as SUBMITTED; defer analysis; never lose complaint |

## 4. ML Evaluation (measured, not asserted)
- Classification: accuracy, precision, recall, F1, confusion matrix.
- Detection/segmentation: mAP, IoU, precision, recall.
- Duplicate: precision/recall/F1, cluster purity.
- Report with `[Insert results after evaluation]`. **No fabricated metrics or graphs.**

## 5. Project Validation Commands (from repo root)
```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
# then platform build_and_start verifies /api/health
```

## 6. Fail-Safe Principle
The citizen must never be blocked, and no complaint may be lost, due to AI/ML failure. Every AI stage is optional/degradable.
