import { beforeEach, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import studySkills from "../../../public/data/courses/study-skills.json";
import programming from "../../../public/data/courses/study-hall-programming.json";
import { parseCatalog, parseDetail } from "../../catalog/domain/course";
import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import { progressStore } from "../infrastructure/browser-progress";
import { updateProgress } from "../domain/progress";
import { createHistoryPage } from "./history-component";

vi.mock("../../catalog/infrastructure/static-catalog", () => ({
  loadCatalog: vi.fn(),
  loadDetail: vi.fn(),
}));
vi.mock("../infrastructure/browser-progress", () => ({
  progressStore: {
    list: vi.fn(),
    refresh: vi.fn(),
    get warning() {
      return "";
    },
  },
}));
vi.mock("../../site/reload-on-restore", () => ({ refreshOnRestore: () => () => {} }));
const courses = parseCatalog(catalog).filter((course) =>
  ["study-skills", "study-hall-programming"].includes(course.id),
);
beforeEach(() => {
  vi.spyOn(progressStore, "warning", "get").mockReturnValue("");
  vi.spyOn(progressStore, "list").mockResolvedValue([]);
  vi.spyOn(progressStore, "refresh").mockResolvedValue([]);
  vi.mocked(loadCatalog).mockResolvedValue(courses);
  vi.mocked(loadDetail)
    .mockReset()
    .mockImplementation(async (course) =>
      parseDetail(course.id === "study-skills" ? studySkills : programming, course),
    );
});

it("loads both catalog collections and their episodes even with no viewing history", async () => {
  const page = createHistoryPage();
  await page.init();
  expect(page.empty).toBe(true);
  expect(page.viewingSummary).toBe(
    "You have watched 0 episodes across 0 courses, a total of 0% of all episodes.",
  );
  expect(page.catalogCollections.map((collection) => collection.courses.length)).toEqual([1, 1]);
  expect(page.catalogCourses.reduce((sum, course) => sum + course.episodes.length, 0)).toBe(38);
  expect(page.catalogCourses[0]!.episodes[0]!.href).toContain("course=study-skills");
});

it("shows newest-first history alongside the full catalog", async () => {
  vi.spyOn(progressStore, "list").mockResolvedValue([
    updateProgress(null, studySkills.episodes[0]!.videoId, { type: "complete" }, 100),
    updateProgress(null, programming.episodes[0]!.videoId, { type: "complete" }, 200),
  ]);
  const page = createHistoryPage();
  await page.init();
  expect(page.entries.map((entry) => entry.videoId)).toEqual([
    programming.episodes[0]!.videoId,
    studySkills.episodes[0]!.videoId,
  ]);
  expect(page.viewingSummary).toBe(
    "You have watched 2 episodes across 2 courses, a total of 5.3% of all episodes.",
  );
  expect(page.catalogCollections.map((collection) => collection.courses.length)).toEqual([1, 1]);
  expect(page.entries).toHaveLength(2);
});

it("retains course headings and history when a detail fails, then recovers on retry", async () => {
  vi.spyOn(progressStore, "list").mockResolvedValue([
    updateProgress(null, studySkills.episodes[0]!.videoId, { type: "complete" }, 100),
  ]);
  vi.mocked(loadDetail).mockRejectedValueOnce(new Error("offline"));
  const page = createHistoryPage();
  await page.init();
  expect(page.catalogCourses[0]!.unavailable).toBe(true);
  expect(page.catalogCollections[0]!.countLabel).toBe("— / 10");
  expect(page.catalogCollections[0]!.topics[0]!.countLabel).toBe("— / 10");
  expect(page.catalogCollections[1]!.countLabel).toBe("0 / 28");
  expect(page.viewingSummary).not.toContain("% of all episodes");
  expect(page.catalogCourses).toHaveLength(2);
  expect(page.catalogWarning).not.toBe("");
  expect(page.entries[0]!.href).toContain("youtube.com");
  vi.mocked(loadDetail).mockClear();
  await page.loadMetadata();
  expect(loadDetail).toHaveBeenCalledTimes(1);
  expect(page.catalogWarning).toBe("");
  expect(page.catalogCourses[0]!.episodes).toHaveLength(10);
  expect(page.entries[0]!.title).toBe("Taking Notes");
});

it("marks played and completed catalog episodes, ignores untouched records, and refreshes after reset", async () => {
  const played = updateProgress(
    null,
    studySkills.episodes[0]!.videoId,
    { type: "playback", position: 30, duration: 300 },
    100,
  );
  const completed = updateProgress(
    null,
    studySkills.episodes[1]!.videoId,
    { type: "complete" },
    200,
  );
  const untouched = updateProgress(
    null,
    studySkills.episodes[2]!.videoId,
    { type: "playback", position: 0, duration: 300 },
    300,
  );
  vi.spyOn(progressStore, "list").mockResolvedValue([played, completed, untouched]);
  const page = createHistoryPage();
  await page.init();
  expect(
    page.catalogCollections[0]!.courses[0]!.episodes.slice(0, 3).map((episode) => episode.watched),
  ).toEqual([true, true, false]);
  expect(page.catalogCollections[0]!.watchedCount).toBe(2);
  expect(page.catalogCollections[0]!.episodeCount).toBe(10);
  expect(page.catalogCollections[0]!.courses[0]!.watchedCount).toBe(2);
  expect(page.catalogCollections[0]!.courses[0]!.episodes[0]!.watched).toBe(true);
  vi.spyOn(progressStore, "refresh").mockResolvedValue([
    updateProgress(played, played.videoId, { type: "reset" }, 400),
    completed,
  ]);
  await page.refreshProgress();
  expect(page.catalogCollections[0]!.courses[0]!.episodes[0]!.watched).toBe(false);
  expect(page.catalogCollections[0]!.courses[0]!.episodes[1]!.activityLabel).toBe("Completed");
  expect(page.catalogCollections[0]!.watchedCount).toBe(1);
  expect(page.catalogCollections[0]!.courses[0]!.watchedCount).toBe(1);
});

it("groups each collection by homepage subject and orders courses alphabetically within topics", async () => {
  const page = createHistoryPage();
  await page.init();
  const original = page.catalogCourses[0]!;
  page.catalogCourses = [
    { ...original, id: "zeta", title: "Zeta", subject: "Science" },
    { ...original, id: "other-topic", title: "First", subject: "History" },
    { ...original, id: "alpha", title: "Alpha", subject: "Science" },
    page.catalogCourses[1]!,
  ];
  expect(page.catalogCollections[0]!.topics.map((topic) => topic.title)).toEqual([
    "History",
    "Science",
  ]);
  expect(page.catalogCollections[0]!.topics[1]!.courses.map((course) => course.title)).toEqual([
    "Alpha",
    "Zeta",
  ]);
  expect(page.catalogCollections[1]!.topics[0]!.courses.map((course) => course.id)).toEqual([
    "study-hall-programming",
  ]);
  expect(page.catalogCollections[0]!.topics[1]!.episodeCount).toBe(20);
});

it("does not report zero watched episodes when storage could not be read", async () => {
  vi.spyOn(progressStore, "warning", "get").mockReturnValue("Saved progress unavailable");
  const page = createHistoryPage();
  await page.init();
  expect(page.viewingSummary).toContain("unavailable");
  expect(page.catalogCollections[0]!.countLabel).toBe("— / 10");
  expect(page.catalogCollections[0]!.courses[0]!.progressLabel).toContain("unavailable");
});

it("retries a missing catalog on restore even when there is no viewing history", async () => {
  vi.mocked(loadCatalog).mockRejectedValueOnce(new Error("offline"));
  const page = createHistoryPage();
  await page.init();
  expect(page.catalogCourses).toEqual([]);
  await page.refreshProgress();
  expect(page.catalogCourses).toHaveLength(2);
  expect(page.catalogWarning).toBe("");
});

it("shows a nonzero percentage for a single watched episode in a large catalog", async () => {
  vi.spyOn(progressStore, "list").mockResolvedValue([
    updateProgress(null, studySkills.episodes[0]!.videoId, { type: "complete" }, 100),
  ]);
  const page = createHistoryPage();
  await page.init();
  const course = page.catalogCourses[0]!;
  const episode = course.episodes[0]!;
  page.catalogCourses = [
    {
      ...course,
      episodeCount: 2002,
      episodes: [
        episode,
        ...Array.from({ length: 2001 }, (_, index) => ({
          ...episode,
          videoId: String(index).padStart(11, "0"),
        })),
      ],
    },
  ];
  expect(page.viewingSummary).toBe(
    "You have watched 1 episode across 1 course, a total of <0.1% of all episodes.",
  );
});
