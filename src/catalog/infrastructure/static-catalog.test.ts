import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import { parseCatalog } from "../domain/course";
import detail from "../../../public/data/courses/study-skills.json";
import { loadCatalog, loadDetail } from "./static-catalog";

describe("catalog loading", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("loads relative to the page directory and clears the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { baseURI: "https://example.com/university/index.html" });
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => catalog });
    vi.stubGlobal("fetch", fetcher);
    expect(await loadCatalog()).toEqual(parseCatalog(catalog));
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://example.com/university/data/courses.json",
    );
    expect(vi.getTimerCount()).toBe(0);
  });
  it("loads the selected course file and validates the response", async () => {
    vi.stubGlobal("document", {
      baseURI: "https://example.com/university/course.html?id=study-skills",
    });
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => detail });
    vi.stubGlobal("fetch", fetcher);
    const course = parseCatalog(catalog)[0]!;
    expect(await loadDetail(course)).toEqual(detail);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://example.com/university/data/courses/study-skills.json",
    );
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ ...detail, courseId: "other" }) });
    await expect(loadDetail(course)).rejects.toThrow("do not match");
  });
  it("aborts a stalled response body and releases its timer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { baseURI: "https://example.com/" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: URL, options: RequestInit) => ({
        ok: true,
        json: () =>
          new Promise((_resolve, reject) => {
            options.signal!.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      })),
    );
    const result = expect(loadCatalog()).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(12000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects unsuccessful HTTP responses", async () => {
    vi.stubGlobal("document", { baseURI: "https://example.com/" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(loadCatalog()).rejects.toThrow("couldn’t load");
  });
});
