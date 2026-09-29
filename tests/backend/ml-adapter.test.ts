import { afterEach, describe, expect, it, vi } from "vitest";
import { getMlClient, MlUnavailableError, type DuplicateCandidate } from "@/lib/ml";
import { HttpMlClient } from "@/lib/ml/http-client";
import { MockMlClient } from "@/lib/ml/mock-client";
import { fuse, type PipelineDeps, runPipeline } from "@/lib/pipeline";

const mock = new MockMlClient();

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ML_SERVICE_URL;
  process.env.ML_MODE = "mock";
});

describe("MockMlClient (rule-based stub, not a model)", () => {
  it("classifies by keyword, honours the hint, falls back to OTHER", async () => {
    expect((await mock.classifyText({ text: "huge pothole on the road" })).category).toBe("POTHOLE_ROAD_DAMAGE");
    expect((await mock.classifyText({ text: "garbage dump and litter everywhere" })).category).toBe("GARBAGE");
    expect((await mock.classifyText({ text: "Vague words", categoryHint: "FALLEN_TREE" })).category).toBe("FALLEN_TREE");
    const other = await mock.classifyText({ text: "Vague words" });
    expect(other.category).toBe("OTHER");
    expect(other.confidence).toBeLessThan(0.5);
  });

  it("declines image classification instead of fabricating a CV result", async () => {
    expect(await mock.classifyImage()).toBeNull();
  });

  it("assigns severity from cues, urgency and cluster size", async () => {
    const sev = (text: string, urgency: any = null, similar_count = 0) =>
      mock.predictSeverity({ category: "OTHER", text, urgency, similar_count }).then((r) => r.severity);
    expect(await sev("a fatal accident happened")).toBe("CRITICAL");
    expect(await sev("children fell here")).toBe("HIGH");
    expect(await sev("a small crack")).toBe("LOW");
    expect(await sev("a small crack", "CRITICAL")).toBe("CRITICAL");
    expect(await sev("a small crack", null, 6)).toBe("HIGH");
  });

  it("computes a bounded, monotonic priority with reasons", async () => {
    const p = (severity: any, cluster_size = 1) =>
      mock.computePriority({ severity, urgency: null, cluster_size, persistence_days: 0, location_impact: null, confidence: 0.5 });
    const low = await p("LOW");
    const crit = await p("CRITICAL", 30);
    expect(low.score).toBeLessThan(crit.score);
    for (const r of [low, crit]) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.reasons.length).toBeGreaterThan(0);
      expect(r.weights_version).toContain("unvalidated");
    }
  });

  it("finds paraphrased nearby duplicates and ignores far / unrelated ones", async () => {
    const cand = (id: string, text: string, lat: number, lng: number): DuplicateCandidate => ({
      id, text, lat, lng, createdAt: new Date(), category: "POTHOLE_ROAD_DAMAGE", clusterId: null,
    });
    const r = await mock.findDuplicates({
      text: "Large pothole near XYZ road", category: "POTHOLE_ROAD_DAMAGE", lat: 19.0, lng: 72.8, createdAt: new Date(),
      candidates: [
        cand("near", "Big pothole near XYZ road", 19.0, 72.8001),
        cand("far", "Big pothole near XYZ road", 19.5, 72.8),
        cand("unrelated", "Tree blocking the lane", 19.0, 72.8),
      ],
    });
    expect(r.is_duplicate).toBe(true);
    expect(r.similar_complaint_ids).toEqual(["near"]);
  });
});

describe("fusion (docs/09 §2.4)", () => {
  it("uses the single available modality", () => {
    expect(fuse({ category: "GARBAGE", confidence: 0.6 }, null)?.category).toBe("GARBAGE");
    expect(fuse(null, { category: "GARBAGE", confidence: 0.6 })?.category).toBe("GARBAGE");
    expect(fuse(null, null)).toBeNull();
  });
  it("boosts confidence when text and image agree", () => {
    const r = fuse({ category: "GARBAGE", confidence: 0.6 }, { category: "GARBAGE", confidence: 0.7 })!;
    expect(r.agreed).toBe(true);
    expect(r.confidence).toBeGreaterThan(0.7);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
  it("keeps the higher-confidence result and flags disagreement", () => {
    const r = fuse({ category: "GARBAGE", confidence: 0.6 }, { category: "FALLEN_TREE", confidence: 0.9 })!;
    expect(r).toMatchObject({ category: "FALLEN_TREE", agreed: false });
  });
});

describe("runPipeline (no database)", () => {
  const deps = (ml: any): PipelineDeps => ({
    ml,
    loadCandidates: async () => [],
    loadClusterContext: async () => ({ clusterSize: 1, firstReportedAt: null }),
  });
  const input = { text: "pothole", categoryHint: null, urgency: null, lat: null, lng: null, createdAt: new Date(), images: [] };

  it("discards a low-confidence image result and asks for review", async () => {
    const ml = Object.assign(Object.create(mock), {
      classifyImage: async () => ({ category: "GARBAGE", confidence: 0.2 }),
    });
    const r = await runPipeline(deps(ml), { ...input, images: [{ storageKey: "k", mime: "image/png" }] });
    expect(r.category).toBe("POTHOLE_ROAD_DAMAGE");
    expect(r.needsReview).toBe(true);
    expect(r.explanation.join(" ")).toContain("discarded");
  });

  it("degrades to text-only when CV is unavailable, and defers only if nothing can be analysed", async () => {
    const cvDown = Object.assign(Object.create(mock), { classifyImage: async () => { throw new MlUnavailableError("cv down"); } });
    const ok = await runPipeline(deps(cvDown), { ...input, images: [{ storageKey: "k", mime: "image/png" }] });
    expect(ok.category).toBe("POTHOLE_ROAD_DAMAGE");
    expect(ok.explanation.join(" ")).toContain("Image analysis was unavailable");

    await expect(runPipeline(deps(cvDown), { ...input, text: null, images: [{ storageKey: "k", mime: "image/png" }] })).rejects.toBeInstanceOf(MlUnavailableError);
  });

  it("tags mock output so it cannot be mistaken for a real prediction", async () => {
    const r = await runPipeline(deps(mock), input);
    expect(r.provider).toBe("MOCK");
    expect(r.explanation[0]).toContain("[MOCK]");
  });
});

describe("HttpMlClient (real-service adapter, verified here with a stubbed fetch only)", () => {
  const withUrl = () => {
    process.env.ML_SERVICE_URL = "http://ml.internal";
    return new HttpMlClient();
  };
  const respond = (body: unknown, status = 200) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it("parses a valid /ml/classify/text response", async () => {
    const c = withUrl();
    respond({ category: "GARBAGE", confidence: 0.9, candidates: [] });
    const r = await c.classifyText({ text: "garbage" });
    expect(r.category).toBe("GARBAGE");
    expect((fetch as any).mock.calls[0][0]).toBe("http://ml.internal/ml/classify/text");
  });

  it("maps priority_score/priority_level to score/level", async () => {
    const c = withUrl();
    respond({ priority_score: 71.6, priority_level: "HIGH", reasons: ["r"], weights_version: "v1" });
    const r = await c.computePriority({ severity: "HIGH", urgency: null, cluster_size: 3, persistence_days: 1, location_impact: null, confidence: 0.8 });
    expect(r).toMatchObject({ score: 72, level: "HIGH", weights_version: "v1" });
  });

  it("raises MlUnavailableError on HTTP errors, bad JSON shape, network failure and missing URL", async () => {
    const c = withUrl();
    respond({}, 500);
    await expect(c.classifyText({ text: "x" })).rejects.toBeInstanceOf(MlUnavailableError);
    respond({ category: "NOT_A_CATEGORY", confidence: 5 });
    await expect(c.classifyText({ text: "x" })).rejects.toBeInstanceOf(MlUnavailableError);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    await expect(c.classifyText({ text: "x" })).rejects.toBeInstanceOf(MlUnavailableError);
    delete process.env.ML_SERVICE_URL;
    await expect(new HttpMlClient().classifyText({ text: "x" })).rejects.toBeInstanceOf(MlUnavailableError);
  });
});

describe("adapter selection", () => {
  it("honours ML_MODE and defaults by ML_SERVICE_URL", async () => {
    process.env.ML_MODE = "mock";
    expect(getMlClient()).toBeInstanceOf(MockMlClient);
    process.env.ML_MODE = "http";
    expect(getMlClient()).toBeInstanceOf(HttpMlClient);
    process.env.ML_MODE = "disabled";
    await expect(getMlClient().classifyText({ text: "x" })).rejects.toBeInstanceOf(MlUnavailableError);
    process.env.ML_MODE = "";
    expect(getMlClient()).toBeInstanceOf(MockMlClient);
    process.env.ML_SERVICE_URL = "http://x";
    expect(getMlClient()).toBeInstanceOf(HttpMlClient);
  });
});
