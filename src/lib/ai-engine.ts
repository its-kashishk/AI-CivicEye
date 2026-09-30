import { Category, Severity, PriorityLevel } from "./types";
import { CANONICAL_DEPARTMENTS } from "./constants";

export interface AIAnalysisResult {
  category: Category;
  categoryConfidence: number;
  severity: Severity;
  severityConfidence: number;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  priorityReasons: string[];
  prioritySignals: Record<string, number>;
  duplicateMatch: {
    isDuplicate: boolean;
    clusterId: string | null;
    similarCount: number;
    matchedComplaintIds: string[];
    matchReasons: string[];
  };
  explanation: string[];
  departmentCode: string;
}

// Category keyword mappings for NLP triage
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  POTHOLE_ROAD_DAMAGE: [
    "pothole",
    "crater",
    "road",
    "asphalt",
    "tar",
    "crack",
    "cave-in",
    "pavement",
    "speed breaker",
    "manhole",
    "highway",
    "lane",
    "street damage",
    "tarmac",
    "uneven road",
  ],
  GARBAGE: [
    "garbage",
    "trash",
    "waste",
    "dump",
    "debris",
    "litter",
    "rubbish",
    "refuse",
    "dustbin",
    "stinking",
    "foul smell",
    "decaying",
    "plastic pile",
    "overflowing bin",
  ],
  DRAINAGE_WATERLOGGING: [
    "waterlogging",
    "drain",
    "drainage",
    "flooding",
    "sewage",
    "gutter",
    "water logged",
    "overflowing drain",
    "blocked drain",
    "stagnant water",
    "clogged drain",
    "monsoon water",
  ],
  STREETLIGHT_FAILURE: [
    "streetlight",
    "street light",
    "light",
    "dark",
    "darkness",
    "bulb",
    "pole",
    "lamp post",
    "electric pole",
    "sparking",
    "wire hanging",
    "blackout",
    "illumination",
  ],
  FALLEN_TREE: [
    "tree",
    "branch",
    "fallen tree",
    "uprooted",
    "timber",
    "greenery",
    "blocking road",
    "overgrown branch",
    "foliage",
  ],
  WATER_LEAKAGE: [
    "pipeline",
    "pipe burst",
    "leakage",
    "water supply",
    "drinking water",
    "pipeline leak",
    "gushing water",
    "water pressure",
    "tanker",
  ],
  OTHER: ["noise", "encroachment", "stray", "nuisance", "civic", "general"],
};

// Critical severity keywords
const CRITICAL_KEYWORDS = [
    "critical",
    "danger",
    "hazard",
    "emergency",
    "sparking",
    "deep",
    "cave-in",
    "burst",
    "accident",
    "life-threatening",
    "major flood",
    "hospital",
    "school zone",
    "ambulance",
    "electrocution",
];

const HIGH_KEYWORDS = [
  "severe",
  "large",
  "big",
  "heavy",
  "major",
  "blocking",
  "overflowing",
  "urgent",
  "main road",
  "junction",
  "traffic jam",
];

const MEDIUM_KEYWORDS = [
  "moderate",
  "broken",
  "slow",
  "dirty",
  "smell",
  "inconvenient",
  "small",
];

export function analyzeComplaintTextAndMedia(params: {
  text: string;
  categoryHint?: Category | null;
  urgency?: Severity | null;
  cvCategory?: Category | null;
  cvConfidence?: number;
  location?: { lat?: number | null; lng?: number | null; address?: string | null };
  existingComplaints?: Array<{
    id: string;
    text: string;
    category?: Category | null;
    clusterId?: string | null;
    createdAt?: Date | string;
    lat?: number | null;
    lng?: number | null;
  }>;
}): AIAnalysisResult {
  const lowerText = (params.text || "").toLowerCase();

  // 1. Category Classification
  let bestCategory: Category = params.categoryHint || "OTHER";
  let maxMatchScore = 0;
  const categoryScores: Record<Category, number> = {
    POTHOLE_ROAD_DAMAGE: 0,
    GARBAGE: 0,
    DRAINAGE_WATERLOGGING: 0,
    STREETLIGHT_FAILURE: 0,
    FALLEN_TREE: 0,
    WATER_LEAKAGE: 0,
    OTHER: 0.1,
  };

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const categoryKey = cat as Category;
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        categoryScores[categoryKey] += 1;
      }
    }
  }

  // Weight user category hint
  if (params.categoryHint && categoryScores[params.categoryHint] !== undefined) {
    categoryScores[params.categoryHint] += 1.5;
  }

  // Weight CV prediction if provided
  if (params.cvCategory && categoryScores[params.cvCategory] !== undefined) {
    categoryScores[params.cvCategory] += (params.cvConfidence || 0.8) * 2;
  }

  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score > maxMatchScore) {
      maxMatchScore = score;
      bestCategory = cat as Category;
    }
  }

  const categoryConfidence = Math.min(
    0.98,
    Math.max(0.62, 0.5 + maxMatchScore * 0.12)
  );

  // 2. Severity Assessment
  let calculatedSeverity: Severity = "LOW";
  let severityScoreValue = 0.25;

  const hasCriticalKw = CRITICAL_KEYWORDS.some((kw) => lowerText.includes(kw));
  const hasHighKw = HIGH_KEYWORDS.some((kw) => lowerText.includes(kw));
  const hasMediumKw = MEDIUM_KEYWORDS.some((kw) => lowerText.includes(kw));

  if (hasCriticalKw || params.urgency === "CRITICAL") {
    calculatedSeverity = "CRITICAL";
    severityScoreValue = 1.0;
  } else if (hasHighKw || params.urgency === "HIGH") {
    calculatedSeverity = "HIGH";
    severityScoreValue = 0.75;
  } else if (hasMediumKw || params.urgency === "MEDIUM") {
    calculatedSeverity = "MEDIUM";
    severityScoreValue = 0.5;
  } else {
    calculatedSeverity = "LOW";
    severityScoreValue = 0.25;
  }

  const severityConfidence = Math.min(
    0.95,
    Math.max(0.7, 0.65 + (hasCriticalKw || hasHighKw ? 0.2 : 0.1))
  );

  // 3. Duplicate Detection Simulation (Multi-Gate)
  let isDuplicate = false;
  let matchedClusterId: string | null = null;
  const matchedComplaintIds: string[] = [];
  const matchReasons: string[] = [];
  let clusterSize = 1;

  if (params.existingComplaints && params.existingComplaints.length > 0) {
    for (const item of params.existingComplaints) {
      if (!item.text) continue;
      // Category gate
      const sameCategory = item.category === bestCategory;
      if (!sameCategory) continue;

      // Word overlap / semantic gate
      const wordsA = new Set(lowerText.split(/\s+/).filter((w) => w.length > 3));
      const wordsB = new Set(
        item.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      );
      let common = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) common++;
      }
      const overlap = wordsA.size > 0 ? common / Math.max(wordsA.size, wordsB.size) : 0;

      // Geo proximity check (< 150m)
      let closeGeo = false;
      if (
        params.location?.lat &&
        params.location?.lng &&
        item.lat &&
        item.lng
      ) {
        const dLat = Math.abs(params.location.lat - item.lat);
        const dLng = Math.abs(params.location.lng - item.lng);
        // Approx 0.0015 deg ~ 160m
        if (dLat < 0.002 && dLng < 0.002) {
          closeGeo = true;
        }
      }

      if (overlap >= 0.4 || (overlap >= 0.25 && closeGeo)) {
        isDuplicate = true;
        matchedComplaintIds.push(item.id);
        matchedClusterId = item.clusterId || item.id;
        clusterSize++;
        if (closeGeo) matchReasons.push("Geospatial proximity (<150m)");
        matchReasons.push("Semantic problem similarity");
      }
    }
  }

  // 4. Priority Engine Formulation (docs/13_PRIORITY_ENGINE.md)
  // priority_score = 100 * ( w_s*s + w_c*c + w_u*u + w_l*l + w_d*d + w_k*k )
  const w_s = 0.35;
  const w_c = 0.2;
  const w_u = 0.15;
  const w_l = 0.15;
  const w_d = 0.1;
  const w_k = 0.05;

  const s = severityScoreValue;
  const c = Math.min(1.0, Math.log2(clusterSize + 1) / 3);
  const u =
    params.urgency === "CRITICAL"
      ? 1.0
      : params.urgency === "HIGH"
      ? 0.8
      : params.urgency === "MEDIUM"
      ? 0.5
      : 0.2;
  const l =
    lowerText.includes("hospital") ||
    lowerText.includes("school") ||
    lowerText.includes("main road") ||
    lowerText.includes("highway") ||
    lowerText.includes("junction")
      ? 0.85
      : 0.4;
  const d = 0.1; // new complaint
  const k = categoryConfidence;

  const rawScore = 100 * (w_s * s + w_c * c + w_u * u + w_l * l + w_d * d + w_k * k);
  const priorityScore = Math.min(100, Math.max(10, Math.round(rawScore)));

  let priorityLevel: PriorityLevel = "LOW";
  if (priorityScore >= 75) {
    priorityLevel = "CRITICAL";
  } else if (priorityScore >= 50) {
    priorityLevel = "HIGH";
  } else if (priorityScore >= 25) {
    priorityLevel = "MEDIUM";
  } else {
    priorityLevel = "LOW";
  }

  // Human-readable reasons
  const priorityReasons: string[] = [];
  priorityReasons.push(`Severity assessed as ${calculatedSeverity} (weight 35%)`);
  if (clusterSize > 1) {
    priorityReasons.push(`Detected in cluster with ${clusterSize - 1} related reports (boosted priority)`);
  }
  if (l > 0.5) {
    priorityReasons.push("High public impact location (arterial route/public zone)");
  }
  if (params.urgency) {
    priorityReasons.push(`Citizen reported urgency: ${params.urgency}`);
  }
  priorityReasons.push(`Classification confidence: ${Math.round(categoryConfidence * 100)}%`);

  // Explanation list
  const explanation: string[] = [
    `NLP parsed intent and mapped issue keywords to ${bestCategory.replace(/_/g, " ")}.`,
    `Assessed risk level as ${calculatedSeverity} based on reported impact and hazard markers.`,
    `Calculated unified priority score of ${priorityScore}/100 for dispatch prioritization.`,
  ];
  if (isDuplicate) {
    explanation.push(
      `Identified possible duplicate within neighborhood radius (${matchedComplaintIds.length} related complaints).`
    );
  }

  // Department Routing
  let departmentCode = "GENERAL";
  for (const dept of CANONICAL_DEPARTMENTS) {
    if (dept.categories.includes(bestCategory)) {
      departmentCode = dept.code;
      break;
    }
  }

  return {
    category: bestCategory,
    categoryConfidence: Math.round(categoryConfidence * 100) / 100,
    severity: calculatedSeverity,
    severityConfidence: Math.round(severityConfidence * 100) / 100,
    priorityScore,
    priorityLevel,
    priorityReasons,
    prioritySignals: { s, c, u, l, d, k },
    duplicateMatch: {
      isDuplicate,
      clusterId: matchedClusterId,
      similarCount: matchedComplaintIds.length,
      matchedComplaintIds,
      matchReasons: Array.from(new Set(matchReasons)),
    },
    explanation,
    departmentCode,
  };
}
