import { describe, expect, it, vi, beforeEach } from "vitest";

const { processQueuedReview } = vi.hoisted(() => ({ processQueuedReview: vi.fn() }));
vi.mock("../server/routers", () => ({ processQueuedReview }));
import handler from "../api/queue";

function response() { const state: { code?: number; body?: unknown } = {}; return { state, status(code: number) { state.code = code; return this; }, json(body: unknown) { state.body = body; return this; } } as any; }

describe("queue worker endpoint", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.QUEUE_WORKER_SECRET = "secret"; });
  it("rejects requests without the worker secret", async () => { const res = response(); await handler({ method: "GET", headers: {} } as any, res); expect(res.state.code).toBe(401); expect(processQueuedReview).not.toHaveBeenCalled(); });
  it.each([{ status: "empty" }, { status: "completed", issueCount: 2, bookId: 4 }, { status: "failed", bookId: 4 }])("returns the durable worker state: $status", async state => { processQueuedReview.mockResolvedValueOnce(state); const res = response(); await handler({ method: "GET", headers: { authorization: "Bearer secret" } } as any, res); expect(res.state.code).toBe(200); expect(res.state.body).toEqual(state); });
});
