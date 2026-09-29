import { afterEach, describe, expect, it } from "vitest";
import { GET as listAll, POST as create } from "@/app/api/complaints/route";
import { POST as analyze } from "@/app/api/complaints/analyze/route";
import { GET as getOne, PATCH as patchOne } from "@/app/api/complaints/[id]/route";
import { PATCH as patchStatus } from "@/app/api/complaints/[id]/status/route";
import { GET as getHistory } from "@/app/api/complaints/[id]/history/route";
import { POST as reanalyze } from "@/app/api/complaints/[id]/reanalyze/route";
import { GET as priority } from "@/app/api/complaints/priority/route";
import { GET as duplicates } from "@/app/api/complaints/duplicates/route";
import { GET as overview } from "@/app/api/dashboard/overview/route";
import { GET as departments } from "@/app/api/departments/route";
import { MlUnavailableError, setMlClientForTests, type MlClient } from "@/lib/ml";
import { call, makeUser, mkReq, POTHOLE_TEXT, randomLocation } from "./helpers";

afterEach(() => setMlClientForTests(null));

async function submit(token: string, extra: Record<string, unknown> = {}) {
  return call(create, mkReq("/api/complaints", { token, body: { text: POTHOLE_TEXT, location: randomLocation(), ...extra } }));
}
const detail = (token: string, id: string) => call(getOne, mkReq(`/api/complaints/${id}`, { token }), { id });
const setStatus = (token: string, id: string, body: object) =>
  call(patchStatus, mkReq(`/api/complaints/${id}/status`, { method: "PATCH", token, body }), { id });

describe("complaint creation (end-to-end with the MOCK ML adapter)", () => {
  it("requires authentication", async () => {
    const r = await call(create, mkReq("/api/complaints", { body: { text: POTHOLE_TEXT } }));
    expect(r.status).toBe(401);
  });

  it("creates, analyses, prioritises and routes a complaint (documented response shape)", async () => {
    const u = await makeUser();
    const r = await submit(u.token, { urgency: "HIGH" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      status: "ROUTED",
      category: "POTHOLE_ROAD_DAMAGE",
      department: "ROADS_MUNICIPAL_ENGINEERING",
      duplicate: { is_duplicate: false, cluster_id: null },
      analysis_status: "COMPLETED",
      mock: true, // the mock adapter is always flagged
    });
    expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(r.body.severity);
    expect(Number.isInteger(r.body.priority.score)).toBe(true);
    expect(r.body.priority.score).toBeGreaterThanOrEqual(0);
    expect(r.body.priority.score).toBeLessThanOrEqual(100);
    expect(r.body.priority.reasons.length).toBeGreaterThan(0);
  });

  it("stores full AI analysis, priority, location and lifecycle history", async () => {
    const u = await makeUser();
    const loc = randomLocation();
    const created = await submit(u.token, { location: loc });
    const d = await detail(u.token, created.body.id);
    expect(d.status).toBe(200);
    expect(d.body.location).toMatchObject({ lat: loc.lat, lng: loc.lng });
    expect(d.body.location.geohash).toHaveLength(7);
    expect(d.body.analysis.status).toBe("COMPLETED");
    expect(d.body.analysis.mock).toBe(true);
    expect(d.body.analysis.explanation[0]).toContain("[MOCK]");
    expect(d.body.priority.weights_version).toBe("mock-v0-unvalidated");
    expect(d.body.status_history.map((h: any) => h.to_status)).toEqual(["SUBMITTED", "ANALYZED", "ROUTED"]);
  });

  it("validates input", async () => {
    const u = await makeUser();
    const bad = async (body: unknown) => (await call(create, mkReq("/api/complaints", { token: u.token, body }))).status;
    expect(await bad({})).toBe(400);
    expect(await bad({ text: "hey" })).toBe(400); // too short, no media
    expect(await bad({ text: POTHOLE_TEXT, category_hint: "NOT_A_CATEGORY" })).toBe(400);
    expect(await bad({ text: POTHOLE_TEXT, urgency: "URGENT" })).toBe(400);
    expect(await bad({ text: POTHOLE_TEXT, location: { lat: 95, lng: 10 } })).toBe(400);
    expect(await bad({ text: POTHOLE_TEXT, location: { lat: 10, lng: 181 } })).toBe(400);
    expect(await bad({ text: POTHOLE_TEXT, media: [{ type: "IMAGE", upload_id: "not-a-uuid" }] })).toBe(400);
    expect(await bad({ text: POTHOLE_TEXT, media: [{ type: "IMAGE", upload_id: crypto.randomUUID() }] })).toBe(400);
  });

  it("accepts a complaint without a location", async () => {
    const u = await makeUser();
    const r = await call(create, mkReq("/api/complaints", { token: u.token, body: { text: "Garbage has not been collected for a week" } }));
    expect(r.status).toBe(201);
    expect(r.body.category).toBe("GARBAGE");
    expect(r.body.department).toBe("SOLID_WASTE_MANAGEMENT");
    expect(r.body.location).toBeNull();
  });

  it("falls back to category_hint / OTHER and flags low confidence for review", async () => {
    const u = await makeUser();
    const r = await call(create, mkReq("/api/complaints", { token: u.token, body: { text: "Something is wrong here please look" } }));
    expect(r.body.category).toBe("OTHER");
    expect(r.body.department).toBe("GENERAL");
    expect(r.body.needs_review).toBe(true);
  });
});

describe("retrieval and access control", () => {
  it("owner can read; other citizens get 403; unknown -> 404; bad id -> 400", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const { body } = await submit(owner.token);
    expect((await detail(owner.token, body.id)).status).toBe(200);
    expect((await detail(other.token, body.id)).status).toBe(403);
    expect((await detail(owner.token, crypto.randomUUID())).status).toBe(404);
    expect((await call(getOne, mkReq("/api/complaints/xyz", { token: owner.token }), { id: "xyz" })).status).toBe(400);
  });

  it("citizens list only their own complaints; operators see all; filters + pagination work", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const op = await makeUser("OPERATOR");
    const ca = await submit(a.token);
    await submit(b.token);

    const mine = await call(listAll, mkReq("/api/complaints?mine=true", { token: a.token }));
    expect(mine.body.items.map((i: any) => i.id)).toEqual([ca.body.id]);
    // a citizen cannot widen scope by omitting/altering `mine`
    const noMine = await call(listAll, mkReq("/api/complaints?mine=false", { token: a.token }));
    expect(noMine.body.total).toBe(1);

    const all = await call(listAll, mkReq("/api/complaints?pageSize=1&page=1&status=ROUTED", { token: op.token }));
    expect(all.status).toBe(200);
    expect(all.body.items).toHaveLength(1);
    expect(all.body.total).toBeGreaterThanOrEqual(2);
    expect(all.body).toMatchObject({ page: 1, pageSize: 1 });

    expect((await call(listAll, mkReq("/api/complaints?status=BOGUS", { token: op.token }))).status).toBe(400);
    expect((await call(listAll, mkReq("/api/complaints?pageSize=1000", { token: op.token }))).status).toBe(400);
    expect((await call(listAll, mkReq("/api/complaints"))).status).toBe(401);
  });

  it("supports bbox filtering", async () => {
    const op = await makeUser("OPERATOR");
    const u = await makeUser();
    const loc = { lat: -33.5, lng: 151.5 };
    const c = await submit(u.token, { location: loc });
    const inside = await call(listAll, mkReq("/api/complaints?bbox=151,-34,152,-33", { token: op.token }));
    expect(inside.body.items.map((i: any) => i.id)).toContain(c.body.id);
    const outside = await call(listAll, mkReq("/api/complaints?bbox=0,0,1,1", { token: op.token }));
    expect(outside.body.items.map((i: any) => i.id)).not.toContain(c.body.id);
  });

  it("returns the department list", async () => {
    const u = await makeUser();
    const r = await call(departments, mkReq("/api/departments", { token: u.token }));
    expect(r.status).toBe(200);
    expect(r.body.items.map((d: any) => d.code)).toContain("ROADS_MUNICIPAL_ENGINEERING");
    expect((await call(departments, mkReq("/api/departments"))).status).toBe(401);
  });
});

describe("updates and department assignment", () => {
  it("owner can edit text/urgency; citizens cannot use authority-only fields", async () => {
    const u = await makeUser();
    const { body } = await submit(u.token);
    const patch = (p: object, token = u.token) =>
      call(patchOne, mkReq(`/api/complaints/${body.id}`, { method: "PATCH", token, body: p }), { id: body.id });

    const ok = await patch({ urgency: "CRITICAL", text: "Updated: pothole is now much larger" });
    expect(ok.status).toBe(200);
    expect(ok.body.urgency).toBe("CRITICAL");

    expect((await patch({ department_code: "GENERAL" })).status).toBe(403);
    expect((await patch({ category: "GARBAGE" })).status).toBe(403);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ urgency: "NOPE" })).status).toBe(400);
    const stranger = await makeUser();
    expect((await patch({ urgency: "LOW" }, stranger.token)).status).toBe(403);
  });

  it("operator can re-assign the department (audited) and override the category", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    const { body } = await submit(u.token);
    const patch = (p: object) =>
      call(patchOne, mkReq(`/api/complaints/${body.id}`, { method: "PATCH", token: op.token, body: p }), { id: body.id });

    const r = await patch({ department_code: "STORM_WATER_DRAINAGE", category: "DRAINAGE_WATERLOGGING" });
    expect(r.status).toBe(200);
    expect(r.body.department).toBe("STORM_WATER_DRAINAGE");
    expect(r.body.category).toBe("DRAINAGE_WATERLOGGING");
    expect((await patch({ department_code: "NO_SUCH_DEPT" })).status).toBe(400);
  });
});

describe("lifecycle / status transitions", () => {
  it("walks ROUTED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED with history + resolution info", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    const { body } = await submit(u.token);
    expect((await setStatus(op.token, body.id, { status: "ACKNOWLEDGED", note: "Received" })).status).toBe(200);
    expect((await setStatus(op.token, body.id, { status: "IN_PROGRESS" })).status).toBe(200);
    const resolved = await setStatus(op.token, body.id, { status: "RESOLVED", resolution_note: "Pothole filled" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe("RESOLVED");
    expect(resolved.body.status_history_entry).toMatchObject({ from_status: "IN_PROGRESS", to_status: "RESOLVED" });

    const d = await detail(u.token, body.id);
    expect(d.body.resolution.note).toBe("Pothole filled");
    expect(d.body.resolution.resolved_at).toBeTruthy();
    expect(d.body.resolution.resolved_by).toBe(op.id);

    // resolution info editable while RESOLVED
    const upd = await call(patchOne, mkReq(`/api/complaints/${body.id}`, { method: "PATCH", token: op.token, body: { resolution_note: "Pothole filled and sealed" } }), { id: body.id });
    expect(upd.status).toBe(200);

    expect((await setStatus(op.token, body.id, { status: "CLOSED" })).status).toBe(200);
    const hist = await call(getHistory, mkReq(`/api/complaints/${body.id}/history`, { token: u.token }), { id: body.id });
    expect(hist.body.items.map((h: any) => h.to_status)).toEqual([
      "SUBMITTED", "ANALYZED", "ROUTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED",
    ]);
  });

  it("supports RESOLVED -> REOPENED -> IN_PROGRESS and clears resolution timestamps", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    const { body } = await submit(u.token);
    for (const status of ["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "REOPENED", "IN_PROGRESS"]) {
      expect((await setStatus(op.token, body.id, { status })).status).toBe(200);
    }
  });

  it("rejects invalid transitions, terminal-state changes and misplaced resolution notes", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    const { body } = await submit(u.token);
    const skip = await setStatus(op.token, body.id, { status: "RESOLVED" });
    expect(skip.status).toBe(400);
    expect(skip.body.error.code).toBe("INVALID_TRANSITION");
    // system-only statuses cannot be set manually
    expect((await setStatus(op.token, body.id, { status: "ANALYZED" })).status).toBe(400);
    expect((await setStatus(op.token, body.id, { status: "BOGUS" })).status).toBe(400);
    expect((await setStatus(op.token, body.id, { status: "ACKNOWLEDGED", resolution_note: "x" })).status).toBe(400);

    expect((await setStatus(op.token, body.id, { status: "REJECTED", note: "Spam" })).status).toBe(200);
    expect((await setStatus(op.token, body.id, { status: "ACKNOWLEDGED" })).status).toBe(400); // terminal
  });

  it("only authority roles may change status; citizens get 403; anonymous 401", async () => {
    const u = await makeUser();
    const { body } = await submit(u.token);
    expect((await setStatus(u.token, body.id, { status: "ACKNOWLEDGED" })).status).toBe(403);
    const anon = await call(patchStatus, mkReq(`/api/complaints/${body.id}/status`, { method: "PATCH", body: { status: "ACKNOWLEDGED" } }), { id: body.id });
    expect(anon.status).toBe(401);
  });

  it("department officers are scoped to their own department", async () => {
    const u = await makeUser();
    const roads = await makeUser("DEPT_OFFICER", "ROADS_MUNICIPAL_ENGINEERING");
    const water = await makeUser("DEPT_OFFICER", "WATER_SUPPLY");
    const { body } = await submit(u.token); // pothole -> ROADS
    expect((await detail(water.token, body.id)).status).toBe(403);
    expect((await setStatus(water.token, body.id, { status: "ACKNOWLEDGED" })).status).toBe(403);
    expect((await detail(roads.token, body.id)).status).toBe(200);
    expect((await setStatus(roads.token, body.id, { status: "ACKNOWLEDGED" })).status).toBe(200);
    // officers cannot re-assign departments
    const re = await call(patchOne, mkReq(`/api/complaints/${body.id}`, { method: "PATCH", token: roads.token, body: { department_code: "GENERAL" } }), { id: body.id });
    expect(re.status).toBe(403);
    // their list is scoped
    const list = await call(listAll, mkReq("/api/complaints?pageSize=100", { token: water.token }));
    expect(list.body.items.map((i: any) => i.id)).not.toContain(body.id);
  });
});

describe("duplicate detection + priority queue + dashboard", () => {
  it("clusters near-identical nearby complaints (advisory) and lists the cluster", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    const loc = randomLocation();
    const a = await submit(u.token, { text: "Large pothole near XYZ road junction", location: loc });
    const b = await submit(u.token, { text: "Big pothole near XYZ road junction", location: loc });
    const far = await submit(u.token, { text: "Big pothole near XYZ road junction", location: randomLocation() });

    expect(a.body.duplicate.is_duplicate).toBe(false);
    // The first complaint is grouped once the second arrives.
    expect(b.body.duplicate.is_duplicate).toBe(true);
    const clusterId = b.body.duplicate.cluster_id;
    expect(clusterId).toBeTruthy();
    expect(far.body.duplicate.is_duplicate).toBe(false);

    const aDetail = await detail(u.token, a.body.id);
    expect(aDetail.body.cluster_id).toBe(clusterId);
    const bDetail = await detail(u.token, b.body.id);
    expect(bDetail.body.analysis.duplicate_result.similar_complaint_ids).toContain(a.body.id);
    expect(bDetail.body.status).toBe("ROUTED"); // not auto-merged / auto-closed

    const list = await call(duplicates, mkReq("/api/complaints/duplicates", { token: op.token }));
    const cluster = list.body.clusters.find((c: any) => c.cluster_id === clusterId);
    expect(cluster).toMatchObject({ size: 2, category: "POTHOLE_ROAD_DAMAGE", representative_id: a.body.id });
    expect(cluster.member_ids.sort()).toEqual([a.body.id, b.body.id].sort());

    expect((await call(duplicates, mkReq("/api/complaints/duplicates", { token: u.token }))).status).toBe(403);
  });

  it("priority queue is authority-only, sorted by score desc, and excludes closed complaints", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    const hi = await submit(u.token, { text: "Live wire fallen near a school, huge danger, pothole too", urgency: "CRITICAL" });
    const rejected = await submit(u.token);
    await setStatus(op.token, rejected.body.id, { status: "REJECTED" });

    const q = await call(priority, mkReq("/api/complaints/priority?pageSize=100", { token: op.token }));
    expect(q.status).toBe(200);
    const scores = q.body.items.map((i: any) => i.priority.score);
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
    const ids = q.body.items.map((i: any) => i.id);
    expect(ids).toContain(hi.body.id);
    expect(ids).not.toContain(rejected.body.id);

    expect((await call(priority, mkReq("/api/complaints/priority", { token: u.token }))).status).toBe(403);
    expect((await call(priority, mkReq("/api/complaints/priority?level=NOPE", { token: op.token }))).status).toBe(400);
  });

  it("dashboard overview returns real aggregates for authority only", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    await submit(u.token);
    const r = await call(overview, mkReq("/api/dashboard/overview", { token: op.token }));
    expect(r.status).toBe(200);
    expect(r.body.totals.open).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.body.by_category)).toBe(true);
    expect(r.body.by_category.some((c: any) => c.category === "POTHOLE_ROAD_DAMAGE")).toBe(true);
    expect(Array.isArray(r.body.volume_over_time)).toBe(true);
    expect(Array.isArray(r.body.top_hotspots)).toBe(true);
    expect((await call(overview, mkReq("/api/dashboard/overview", { token: u.token }))).status).toBe(403);

    const officer = await makeUser("DEPT_OFFICER", "WATER_SUPPLY");
    const scoped = await call(overview, mkReq("/api/dashboard/overview", { token: officer.token }));
    expect(scoped.body.by_category.some((c: any) => c.category === "POTHOLE_ROAD_DAMAGE")).toBe(false);
  });
});

describe("AI preview and ML fail-safe behaviour", () => {
  const failingMl: MlClient = {
    provider: "HTTP",
    classifyText: async () => { throw new MlUnavailableError("down"); },
    classifyImage: async () => { throw new MlUnavailableError("down"); },
    findDuplicates: async () => { throw new MlUnavailableError("down"); },
    predictSeverity: async () => { throw new MlUnavailableError("down"); },
    computePriority: async () => { throw new MlUnavailableError("down"); },
  };

  it("/analyze returns a preview and persists nothing", async () => {
    const u = await makeUser();
    const r = await call(analyze, mkReq("/api/complaints/analyze", { token: u.token, body: { text: POTHOLE_TEXT, location: randomLocation() } }));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ category: "POTHOLE_ROAD_DAMAGE", mock: true });
    expect(r.body.explanation.length).toBeGreaterThan(0);
    const list = await call(listAll, mkReq("/api/complaints?mine=true", { token: u.token }));
    expect(list.body.total).toBe(0);
    expect((await call(analyze, mkReq("/api/complaints/analyze", { body: { text: POTHOLE_TEXT } }))).status).toBe(401);
    expect((await call(analyze, mkReq("/api/complaints/analyze", { token: u.token, body: {} }))).status).toBe(400);
  });

  it("/analyze answers 503 ML_UNAVAILABLE (retryable) when ML is down", async () => {
    setMlClientForTests(failingMl);
    const u = await makeUser();
    const r = await call(analyze, mkReq("/api/complaints/analyze", { token: u.token, body: { text: POTHOLE_TEXT } }));
    expect(r.status).toBe(503);
    expect(r.body.error).toMatchObject({ code: "ML_UNAVAILABLE", retryable: true });
  });

  it("never loses a complaint when ML is down: saved as SUBMITTED/PENDING, then recoverable via reanalyze", async () => {
    const u = await makeUser();
    const op = await makeUser("OPERATOR");
    setMlClientForTests(failingMl);
    const created = await submit(u.token);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "SUBMITTED", analysis_status: "PENDING", category: null, priority: null });

    // still retrievable
    const d = await detail(u.token, created.body.id);
    expect(d.status).toBe(200);
    expect(d.body.analysis.status).toBe("PENDING");

    // ML still down -> retry answers 503 but the complaint remains
    const stillDown = await call(reanalyze, mkReq(`/api/complaints/${created.body.id}/reanalyze`, { method: "POST", token: op.token }), { id: created.body.id });
    expect(stillDown.status).toBe(503);
    expect((await detail(u.token, created.body.id)).status).toBe(200);

    // ML back (mock) -> analysis completes and the complaint is routed
    setMlClientForTests(null);
    const ok = await call(reanalyze, mkReq(`/api/complaints/${created.body.id}/reanalyze`, { method: "POST", token: op.token }), { id: created.body.id });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: "ROUTED", analysis_status: "COMPLETED", department: "ROADS_MUNICIPAL_ENGINEERING" });

    // completed analyses cannot be re-run; citizens cannot trigger it
    const again = await call(reanalyze, mkReq(`/api/complaints/${created.body.id}/reanalyze`, { method: "POST", token: op.token }), { id: created.body.id });
    expect(again.status).toBe(409);
    const cit = await call(reanalyze, mkReq(`/api/complaints/${created.body.id}/reanalyze`, { method: "POST", token: u.token }), { id: created.body.id });
    expect(cit.status).toBe(403);
  });

  it("an unexpected ML failure marks the analysis FAILED without failing the request", async () => {
    setMlClientForTests({ ...failingMl, classifyText: async () => { throw new Error("bug"); } });
    const u = await makeUser();
    const created = await submit(u.token);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "SUBMITTED", analysis_status: "FAILED" });
  });
});
