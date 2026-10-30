import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import fixture from "../../../public/data/quizzes/E7CwqNHn_Ns.json";
import { loadQuiz } from "./static-quizzes";
const id = fixture.videoId;
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("static quizzes", () => {
  it("loads and validates a quiz relative to the deployed page directory", async () => {
    vi.stubGlobal("document", { baseURI: "https://example.com/school/watch.html" });
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
    vi.stubGlobal("fetch", fetcher);
    expect((await loadQuiz(id))?.questions).toHaveLength(3);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      `https://example.com/school/data/quizzes/${id}.json`,
    );
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ ...fixture, revision: 0 }) });
    await expect(loadQuiz(id)).rejects.toThrow();
  });
  it("distinguishes an absent quiz from network errors and rejects invalid IDs", async () => {
    vi.stubGlobal("document", { baseURI: "https://example.com/" });
    const fetcher = vi.fn().mockResolvedValue({ status: 404, ok: false });
    vi.stubGlobal("fetch", fetcher);
    expect(await loadQuiz(id)).toBeNull();
    fetcher.mockResolvedValue({ status: 500, ok: false });
    await expect(loadQuiz(id)).rejects.toThrow();
    await expect(loadQuiz("../escape")).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("aborts stalled requests without leaving a timer behind", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { baseURI: "https://example.com/" });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: URL, options: RequestInit) =>
          new Promise((_resolve, reject) =>
            options.signal!.addEventListener("abort", () => reject(new Error("aborted"))),
          ),
      ),
    );
    const result = expect(loadQuiz(id)).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(12000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
});
