import { beforeEach, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import { parseCatalog, parseDetail } from "../domain/course";
import { updateProgress } from "../../learning/domain/progress";
import { loadDetail } from "../infrastructure/static-catalog";
import { createCatalogPage } from "./catalog-component";
import { progressStore } from "../../learning/infrastructure/browser-progress";
vi.mock("../../learning/infrastructure/browser-progress", () => ({
  progressStore: { refresh: vi.fn().mockResolvedValue([]), warning: "" },
}));
const files = import.meta.glob("../../../public/data/courses/*.json", {
  eager: true,
  import: "default",
});
vi.mock("../infrastructure/static-catalog", () => ({
  loadCatalog: async () => parseCatalog(catalog),
  loadDetail: vi.fn(async (course: ReturnType<typeof parseCatalog>[number]) =>
    parseDetail(files[`../../../public/data/courses/${course.id}.json`], course),
  ),
}));
beforeEach(() => {
  vi.spyOn(progressStore, "refresh").mockResolvedValue([]);
  vi.mocked(loadDetail).mockClear();
});
it("combines collection, search, subject and progress filters without leaking recent courses", async () => {
  const records = [
    updateProgress(null, "A_QINscHY3Q", { type: "complete" }, 100),
    updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 200),
  ];
  vi.spyOn(progressStore, "refresh").mockResolvedValue(records);
  const studyHall = createCatalogPage("study-hall");
  await studyHall.load();
  expect(studyHall.error).toBe("");
  expect(studyHall.courses).toHaveLength(15);
  expect(studyHall.recentCourses.map((course) => course.id)).toEqual(["study-hall-algebra"]);
  studyHall.subject = "Mathematics";
  studyHall.query = "James Tanton";
  studyHall.progress = "in-progress";
  expect(studyHall.filteredCourses.map((course) => course.id)).toEqual(["study-hall-algebra"]);
  studyHall.progress = "not-started";
  expect(studyHall.empty).toBe(true);
  studyHall.resetFilters();
  expect(studyHall.filteredCourses).toHaveLength(15);
  const crash = createCatalogPage("crash-course");
  await crash.load();
  expect(crash.courses).toHaveLength(56);
  expect(crash.recentCourses.map((course) => course.id)).toEqual(["study-skills"]);
});

it("supports completed courses and distinguishes original series from College Foundations", async () => {
  const course = parseCatalog(catalog).find((course) => course.id === "study-hall-algebra")!;
  const detail = parseDetail(files[`../../../public/data/courses/${course.id}.json`], course);
  vi.spyOn(progressStore, "refresh").mockResolvedValue(
    detail.episodes.map((episode) =>
      updateProgress(null, episode.videoId, { type: "complete" }, 100),
    ),
  );
  const page = createCatalogPage("study-hall");
  await page.load();
  page.progress = "completed";
  expect(page.filteredCourses.map((course) => course.id)).toEqual(["study-hall-algebra"]);
  page.query = "College Foundations";
  expect(page.empty).toBe(true);
  page.progress = "all";
  expect(page.filteredCourses).toHaveLength(11);
  page.query = "Original series";
  expect(page.filteredCourses).toHaveLength(4);
});

it("renders metadata without downloading episode details when progress is empty", async () => {
  const page = createCatalogPage("crash-course");
  await page.load();
  expect(page.ready).toBe(true);
  expect(loadDetail).not.toHaveBeenCalled();
  expect(page.courses).toHaveLength(56);
  expect(
    page.courses.every(
      (course) => course.progressLabel === `0 of ${course.episodeCount} completed`,
    ),
  ).toBe(true);
  page.progress = "not-started";
  expect(page.filteredCourses).toHaveLength(56);
});

it("keeps the shelf usable and enriches completed requests while another detail is pending", async () => {
  vi.spyOn(progressStore, "refresh").mockResolvedValue([
    updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 200),
  ]);
  let finish!: (detail: ReturnType<typeof parseDetail>) => void;
  const first = parseCatalog(catalog).find((course) => course.collection === "crash-course")!;
  vi.mocked(loadDetail).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const page = createCatalogPage("crash-course");
  const loading = page.load();
  await vi.waitFor(() =>
    expect(page.courses[1]?.summary).toEqual(expect.objectContaining({ completed: 0 })),
  );
  expect(page.ready).toBe(true);
  expect(page.courses[0]!.progressLabel).toBe("Loading progress…");
  page.query = "history";
  expect(page.filteredCourses.length).toBeGreaterThan(0);
  finish(parseDetail(files[`../../../public/data/courses/${first.id}.json`], first));
  await loading;
  expect(page.courses[0]!.summary).not.toBeNull();
});

it("refreshes saved progress without refetching known memberships or resetting filters", async () => {
  vi.spyOn(progressStore, "refresh").mockResolvedValue([
    updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 100),
  ]);
  const page = createCatalogPage("crash-course");
  await page.load();
  expect(loadDetail).toHaveBeenCalledTimes(56);
  page.query = "Thomas";
  page.subject = "Learning skills";
  page.progress = "in-progress";
  vi.spyOn(progressStore, "refresh").mockResolvedValue([]);
  await page.refreshProgress();
  expect(loadDetail).toHaveBeenCalledTimes(56);
  expect(page.query).toBe("Thomas");
  expect(page.subject).toBe("Learning skills");
  expect(page.progress).toBe("in-progress");
  expect(page.recentCourses).toEqual([]);
  expect(page.empty).toBe(true);
});

it("counts a shared video in every owning course", async () => {
  const videoId = "E7CwqNHn_Ns";
  vi.spyOn(progressStore, "refresh").mockResolvedValue([
    updateProgress(null, videoId, { type: "complete" }, 100),
  ]);
  const sharedDetail = async (course: ReturnType<typeof parseCatalog>[number]) => ({
    courseId: course.id,
    episodes: [
      {
        number: 1,
        title: "Shared lesson",
        videoId,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      },
    ],
  });
  vi.mocked(loadDetail).mockImplementationOnce(sharedDetail).mockImplementationOnce(sharedDetail);
  const page = createCatalogPage("crash-course");
  await page.load();
  expect(page.courses.slice(0, 2).map((course) => course.summary?.completed)).toEqual([1, 1]);
});

it("does not let an older enrichment overwrite refreshed progress", async () => {
  vi.spyOn(progressStore, "refresh").mockResolvedValue([
    updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 100),
  ]);
  let finish!: (detail: ReturnType<typeof parseDetail>) => void;
  const first = parseCatalog(catalog).find((course) => course.collection === "crash-course")!;
  vi.mocked(loadDetail).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const page = createCatalogPage("crash-course");
  const loading = page.load();
  await vi.waitFor(() =>
    expect(page.courses[1]?.summary).toEqual(expect.objectContaining({ completed: 0 })),
  );
  vi.spyOn(progressStore, "refresh").mockResolvedValue([]);
  await page.refreshProgress();
  finish(parseDetail(files[`../../../public/data/courses/${first.id}.json`], first));
  await loading;
  expect(page.courses.every((course) => course.summary?.lastActivityAt === 0)).toBe(true);
  expect(page.recentCourses).toEqual([]);
});

it("shows up to three unfinished courses in the hero, newest first, independent of catalog filters", async () => {
  const ids = ["world-history", "psychology", "astronomy", "philosophy", "botany", "study-skills"];
  const courses = parseCatalog(catalog);
  const records = ids.map((id, index) => {
    const course = courses.find((item) => item.id === id)!;
    const detail = parseDetail(files[`../../../public/data/courses/${id}.json`], course);
    return updateProgress(null, detail.episodes[0]!.videoId, { type: "complete" }, 100 + index);
  });
  vi.spyOn(progressStore, "refresh").mockResolvedValue(records);
  const page = createCatalogPage("crash-course");
  await page.load();
  page.query = "no matching course";
  expect(page.heroCourses.map((course) => course.id)).toEqual([
    "study-skills",
    "botany",
    "philosophy",
  ]);
  const botany = page.heroCourses[1]!;
  expect(botany.nextEpisodeTitle).toBe("What Are Plants Made Of?");
  expect(botany.nextEpisodeLabel).toBe("Watch episode 2");
  expect(botany.continueHref).toContain("video=9AEzixu_xZk");
  expect(page.hasHeroCourses).toBe(true);
  vi.spyOn(progressStore, "refresh").mockResolvedValue([]);
  await page.refreshProgress();
  expect(page.hasHeroCourses).toBe(false);
});

it("excludes completed courses from hero suggestions", async () => {
  const course = parseCatalog(catalog).find((item) => item.id === "botany")!;
  const detail = parseDetail(files["../../../public/data/courses/botany.json"], course);
  vi.spyOn(progressStore, "refresh").mockResolvedValue(
    detail.episodes.map((episode) =>
      updateProgress(null, episode.videoId, { type: "complete" }, 100),
    ),
  );
  const page = createCatalogPage("crash-course");
  await page.load();
  expect(page.heroCourses).toEqual([]);
});

it("resumes a partly watched episode even with no completed lessons", async () => {
  vi.spyOn(progressStore, "refresh").mockResolvedValue([
    updateProgress(null, "9AEzixu_xZk", { type: "playback", position: 42, duration: 600 }, 200),
  ]);
  const page = createCatalogPage("crash-course");
  await page.load();
  expect(page.heroCourses).toHaveLength(1);
  expect(page.heroCourses[0]).toEqual(
    expect.objectContaining({
      id: "botany",
      nextEpisodeTitle: "What Are Plants Made Of?",
      nextEpisodeLabel: "Resume episode 2",
      continueHref: "./watch.html?course=botany&video=9AEzixu_xZk",
    }),
  );
});

it("fills remaining hero slots with starters without repeating an active course", async () => {
  const page = createCatalogPage("crash-course");
  await page.load();
  expect(page.heroStarterIds).toEqual(["astronomy", "philosophy", "botany"]);
  const records = [
    updateProgress(null, "0rHUDWjR5gg", { type: "complete" }, 100),
    updateProgress(null, "1A_CAkYt3GY", { type: "complete" }, 200),
    updateProgress(null, "2th5lAd-77A", { type: "complete" }, 300),
  ];
  for (const count of [1, 2, 3]) {
    vi.spyOn(progressStore, "refresh").mockResolvedValue(records.slice(0, count));
    await page.refreshProgress();
    expect(page.heroCourses.length + page.heroStarterIds.length).toBe(3);
    expect(page.heroStarterIds).toEqual(["astronomy", "philosophy", "botany"].slice(count));
  }
});

it("keeps static starter lesson titles and watch URLs aligned with the catalog", async () => {
  const { default: html } = await import("../../../index.html?raw");
  const starters = [
    ...html.matchAll(
      /<article\s+class="chapter-entry"\s+x-show="show\w+Starter"[\s\S]*?<\/article>/g,
    ),
  ];
  expect(starters).toHaveLength(3);
  for (const [article] of starters) {
    const link = article.match(/href="\.\/watch\.html\?course=([^&]+)&amp;video=([^"]+)"/)!;
    const course = parseCatalog(catalog).find((item) => item.id === link[1])!;
    const detail = parseDetail(files[`../../../public/data/courses/${course.id}.json`], course);
    const first = detail.episodes[0]!;
    expect(link[2]).toBe(first.videoId);
    expect(article).toContain(first.title);
    expect(article.match(/href="\.\/watch\.html[^"]+"/g)).toEqual([link[0], link[0]]);
  }
});
