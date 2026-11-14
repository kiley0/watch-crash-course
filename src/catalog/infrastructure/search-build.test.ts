import { build } from "vite-plus";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const overrides = vi.hoisted(() => new Map<string, string>());
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) =>
      overrides.get(String(args[0])) ?? actual.readFileSync(...args),
  };
});
afterEach(() => overrides.clear());
import catalog from "../../../public/data/courses.json";
import { parseCatalog, parseDetail } from "../domain/course";
import { catalogSearchIndex } from "./search-build";

it("emits a separate static index for each collection containing every episode title and description", async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    plugins: [catalogSearchIndex()],
    build: { write: false, rolldownOptions: { input: "index.html" } },
  });
  const outputs = Array.isArray(result)
    ? result.flatMap((item) => item.output)
    : "output" in result
      ? result.output
      : [];
  for (const collection of ["crash-course", "study-hall"]) {
    const asset = outputs.find((item) => item.fileName === `data/course-search/${collection}.json`);
    expect(asset?.type).toBe("asset");
    if (asset?.type !== "asset") throw new Error("Missing search index");
    const index = JSON.parse(String(asset.source)) as Record<string, string>;
    const courses = parseCatalog(catalog).filter((course) => course.collection === collection);
    expect(Object.keys(index)).toEqual(courses.map((course) => course.id));
    for (const course of courses) {
      const detail = parseDetail(
        JSON.parse(readFileSync(`public/data/courses/${course.id}.json`, "utf8")),
        course,
      );
      for (const episode of detail.episodes) {
        expect(index[course.id]).toContain(episode.title);
        if (episode.description) expect(index[course.id]).toContain(episode.description);
      }
    }
  }
});

it("serves current episode descriptions in development after catalog JSON changes", async () => {
  const plugin = catalogSearchIndex();
  const use = vi.fn();
  if (typeof plugin.configureServer !== "function") throw new Error("Missing dev search route");
  await plugin.configureServer.call({} as never, { middlewares: { use } } as never);
  const middleware = use.mock.calls[0]![0];
  const response = { setHeader: vi.fn(), end: vi.fn() };
  const next = vi.fn();
  middleware({ url: "/data/course-search/crash-course.json" }, response, next);
  expect(JSON.parse(response.end.mock.calls[0]![0])["biology-2012"]).not.toContain(
    "updated-search-description",
  );
  const path = resolve("public/data/courses/biology-2012.json");
  const detail = JSON.parse(readFileSync(path, "utf8"));
  detail.episodes[0].description = "updated-search-description";
  overrides.set(path, JSON.stringify(detail));
  middleware({ url: "/data/course-search/crash-course.json" }, response, next);
  expect(JSON.parse(response.end.mock.calls[1]![0])["biology-2012"]).toContain(
    "updated-search-description",
  );
  expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
  middleware({ url: "/index.html" }, response, next);
  expect(next).toHaveBeenCalledOnce();
});
