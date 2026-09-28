# 06 — Data & Dataset Specification

**Project:** AI CivicEye
**Status:** `[PROPOSED]` data strategy. Dataset field-level details are `[REQUIRES VERIFICATION]` unless explicitly marked `[VERIFIED]`.

> **No dataset statistics (row counts, class counts, field names) are fabricated.** Where a value has been confirmed from the source page, it is marked `[VERIFIED]`. Everything else must be inspected before it is claimed.

---

## 1. Dataset A — BMC Civic Complaint Dataset

- **Source:** https://www.kaggle.com/competitions/mumbai-nagar-seva-bmc-civic-complaint-resolution-2018-2024/data
- **Nature:** **Synthetically generated, BMC-grounded civic complaint dataset.** It is **NOT** a set of real individual citizen complaint records. Always describe it as *"synthetically generated BMC-grounded civic complaint dataset"* or *"synthetic civic complaint dataset based on BMC public information."*
- **Purpose in AI CivicEye:** train/prototype complaint classification, severity analysis, department analysis, trend analysis, prioritization experiments, duplicate/similarity research, resolution/satisfaction analysis.

### 1.1 Fields / Targets `[REQUIRES VERIFICATION]`
The exact columns, target variables, and label availability **must be inspected** from the downloaded dataset before being documented. Do **not** invent fields.

| Aspect | Status | Action |
| --- | --- | --- |
| Column names | `[REQUIRES VERIFICATION]` | Inspect CSV headers |
| Category field | `[REQUIRES VERIFICATION]` | Confirm & map to canonical categories |
| Severity/urgency label | `[REQUIRES VERIFICATION]` | If absent, use labeling strategy (`03_ML_PRD.md` ML-04) |
| Department field | `[REQUIRES VERIFICATION]` | Map to canonical departments |
| Timestamp / resolution field | `[REQUIRES VERIFICATION]` | Needed for trends & persistence |
| License / usage terms | `[REQUIRES VERIFICATION]` | Confirm Kaggle competition rules |

### 1.2 Limitations
- **Synthetic** → may not reflect real-world noise, distribution, or edge cases.
- Possible label leakage or unrealistic correlations — validate before modeling.
- Geographic scope limited to BMC context.

---

## 2. Dataset B — Road / Civic Image Datasets (Computer Vision)

### 2.1 Zenodo 7681359 `[VERIFIED from source page]`
- **Title:** "Dataset of Road images, divided in images with and without damages"
- **Published:** 2023-02-27, v1. Authors affiliated with University of Potsdam / Hasso Plattner Institute.
- **Description (verified):** road images labeled **healthy** vs **damaged**; images either rendered from 3D lidar point clouds or captured by a camera mounted on a mobile mapping vehicle.
- **Files (verified):** `panorama.zip` (240.7 MB), `road_images.zip` (428.5 MB); total ~669.2 MB.
- **Reference repo:** https://github.com/Snagnar/CompetitiveReconstructionNetworks
- **License:** `[REQUIRES VERIFICATION]` (confirm on Zenodo before use).
- **Fit:** binary healthy/damaged → supports the `POTHOLE_ROAD_DAMAGE` CV class as a starting point; other CV MVP classes need additional data.

### 2.2 Zenodo 17952339 `[VERIFIED from source page]`
- **Title:** "UAV Road Defect Segmentation Dataset (RDD2022-derived)"
- **Published:** 2025-12-16, v1. Author affiliated with Universidad Carlos III de Madrid.
- **Description (verified):** pixel-level segmentation masks for crack-like road surface defects, derived from RDD2022. **400 images** manually annotated at pixel level. RGB in JPG, binary masks in PNG (matching filenames). Split **80/15/5 (320/60/20)** with a fixed seed.
- **Files (verified):** `dataset_400_clean.zip` (27.3 MB).
- **License:** `[REQUIRES VERIFICATION]` (confirm on Zenodo; note RDD2022 upstream terms too).
- **Fit:** supports **segmentation** of road cracks/defects → richer than binary classification for `POTHOLE_ROAD_DAMAGE`.

### 2.3 Coverage gap
Neither verified image dataset covers `GARBAGE`, `DRAINAGE_WATERLOGGING` (waterlogging), or `FALLEN_TREE`. Additional public datasets for these classes are `[REQUIRES VERIFICATION]`. MVP CV may therefore start with **road-damage detection only** and expand.

---

## 3. Data Management

### 3.1 Layout `[PROPOSED]`
```
data/
├── raw/         # untouched downloads (immutable)
├── processed/   # cleaned/split/normalized artifacts
└── README.md    # provenance + license notes per dataset
```

### 3.2 Raw vs Processed
- **Raw:** never edited; source of truth; document checksums & source URLs.
- **Processed:** derived splits, resized images, tokenized text, feature tables.

### 3.3 Train / Validation / Test
- Text (Dataset A): stratified split by category; hold out a test set untouched until final eval.
- Images (Dataset B): respect any dataset-provided split (17952339 provides 80/15/5); otherwise create stratified splits with a fixed seed.

### 3.4 Preprocessing
- **Text:** normalization, language handling (English/Hindi/Hinglish — see `11_NLP_MODULE.md`), de-identification of PII where present.
- **Images:** resize, EXIF-orient, normalize; strip GPS EXIF for privacy `[PLANNED]`.

### 3.5 Data-leakage prevention
- Split **before** fitting any vectorizer/encoder; fit only on train.
- Ensure duplicate/near-duplicate records don't span train/test.
- Keep synthetic vs any future real data clearly separated.

### 3.6 Data versioning `[PLANNED]`
- Track dataset version, split seed, and preprocessing config; store a manifest (e.g., `data/processed/manifest.json`) so experiments are reproducible.

---

## 4. Recommended Charts (only from verified/real data)

Category distribution, severity distribution, department distribution, complaint volume over time, resolution status, duplicate cluster sizes, geographic hotspots. **If data is not yet inspected, use `[Insert after dataset inspection]`.** Never fabricate distributions.
