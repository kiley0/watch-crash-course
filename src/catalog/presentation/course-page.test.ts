import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import detail from "../../../public/data/courses/big-history.json";
import { parseCatalog, parseDetail } from "../domain/course";
import { updateProgress } from "../../learning/domain/progress";

const mocks = vi.hoisted(() => ({
  factory: undefined as undefined | (() => any),
  loadProgress: vi.fn(),
  refreshProgress: vi.fn(),
  updateProgress: vi.fn(),
  focusCompletion: vi.fn(),
  stopRestore: vi.fn(),
}));
vi.mock("@alpinejs/csp", () => ({
  default: {
    data: (_name: string, factory: () => any) => {
      mocks.factory = factory;
    },
    start: vi.fn(),
    nextTick: async (callback: () => void) => callback?.(),
  },
}));
vi.mock("../../site/reload-on-restore", () => ({
  refreshOnRestore: () => mocks.stopRestore,
}));
vi.mock("../../learning/infrastructure/browser-progress", () => ({
  progressStore: {
    load: mocks.loadProgress,
    refresh: mocks.refreshProgress,
    update: mocks.updateProgress,
    warning: "",
  },
}));
vi.mock("../infrastructure/static-catalog", () => ({
  loadCatalog: async () => parseCatalog(catalog),
  loadDetail: async (course: ReturnType<typeof parseCatalog>[number]) =>
    parseDetail(detail, course),
}));
import "./course-page";

const course = parseCatalog(catalog).find((item) => item.id === "big-history")!;
const episodes = parseDetail(detail, course).episodes;
beforeEach(() => {
  vi.stubGlobal("window", {
    location: { search: "?id=big-history" },
  });
  vi.stubGlobal("document", {
    title: "",
    getElementById: () => ({ focus: mocks.focusCompletion }),
  });
  mocks.loadProgress.mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("lists all episodes in order and filters titles, numbers, and descriptions", async () => {
  const page = mocks.factory!();
  await page.init();
  expect(page.error).toBe("");
  expect(page.hasFeaturedEpisode).toBe(false);
  expect(page.completionLabel).toBe("0 of 16 episodes watched");
  expect(page.filteredEpisodes.map((episode: { number: number }) => episode.number)).toEqual(
    episodes.map((episode) => episode.number),
  );
  page.query = "Big Bang";
  expect(page.filteredEpisodes[0].videoId).toBe(episodes[0]!.videoId);
  expect(page.filteredEpisodes).toHaveLength(1);
  page.query = "16";
  expect(page.filteredEpisodes.map((episode: { number: number }) => episode.number)).toContain(16);
  page.episodes[0].description = "A distinctive study keyword";
  page.query = "distinctive";
  expect(page.filteredEpisodes).toHaveLength(1);
  page.query = "nonexistentword";
  expect(page.empty).toBe(true);
  page.clearSearch();
  expect(page.filteredEpisodes).toHaveLength(16);
  page.destroy();
  expect(mocks.stopRestore).toHaveBeenCalledOnce();
});

it("resumes the saved unfinished episode while listing earlier completed episodes", async () => {
  const first = episodes[0]!;
  const resume = episodes[7]!;
  mocks.loadProgress.mockImplementation(async (id: string) => {
    if (id === first.videoId) return updateProgress(null, id, { type: "complete" }, 100);
    if (id === resume.videoId)
      return updateProgress(null, id, { type: "playback", position: 127, duration: 600 }, 200);
    return null;
  });
  const page = mocks.factory!();
  await page.init();
  expect(page.hasCourseActivity).toBe(true);
  expect(page.currentEpisode.videoId).toBe(resume.videoId);
  expect(page.currentEpisode.href).toBe(`./watch.html?course=big-history&video=${resume.videoId}`);
  expect(page.hasFeaturedEpisode).toBe(true);
  expect(page.featuredButtonLabel).toBe("Resume at 2:07");
  expect(page.currentEpisode.lastWatchDateTime).toBe(new Date(200).toISOString());
  expect(page.currentEpisode.lastWatchDate).not.toBe("");
  expect(page.filteredEpisodes[0].status).toBe("Completed");
  expect(page.filteredEpisodes[0].watchedDate).toBe(
    new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(
      100,
    ),
  );
  expect(page.filteredEpisodes[0].watchedDateTime).toBe(new Date(100).toISOString());
  expect(page.filteredEpisodes[7].watchedDate).toBe("");
  expect(page.filteredEpisodes[1].watchedDate).toBe("");
  expect(page.filteredEpisodes[7].status).toBe("In progress");
  expect(page.filteredEpisodes.at(-1).number).toBe(16);
  page.destroy();
});

it("offers the next episode after completion and hides the feature when the course is complete", async () => {
  mocks.loadProgress.mockImplementation(async (id: string) =>
    id === episodes[0]!.videoId ? updateProgress(null, id, { type: "complete" }, 100) : null,
  );
  const page = mocks.factory!();
  await page.init();
  expect(page.currentEpisode.videoId).toBe(episodes[1]!.videoId);
  expect(page.currentEpisode.lastWatchDate).toBe("");
  expect(page.hasFeaturedEpisode).toBe(true);
  expect(page.featuredButtonLabel).toBe("Continue learning");
  mocks.loadProgress.mockImplementation(async (id: string) =>
    updateProgress(null, id, { type: "complete" }, 200),
  );
  await page.load();
  expect(page.courseComplete).toBe(true);
  expect(page.hasFeaturedEpisode).toBe(false);
  expect(page.currentEpisode.videoId).toBe(episodes[0]!.videoId);
  page.destroy();
});

it("features the next episode after the latest completion instead of an older unfinished episode", async () => {
  mocks.loadProgress.mockImplementation(async (id: string) => {
    if (id === episodes[0]!.videoId)
      return updateProgress(null, id, { type: "playback", position: 50, duration: 600 }, 100);
    if (id === episodes[7]!.videoId) return updateProgress(null, id, { type: "complete" }, 200);
    return null;
  });
  const page = mocks.factory!();
  await page.init();
  expect(page.currentEpisode.videoId).toBe(episodes[8]!.videoId);
  expect(page.featuredButtonLabel).toBe("Continue learning");
  page.query = "zznomatch";
  expect(page.empty).toBe(true);
  expect(page.hasFeaturedEpisode).toBe(true);
  page.destroy();
});

it("shows the saved resume time when the duration is unknown", async () => {
  mocks.loadProgress.mockImplementation(async (id: string) =>
    id === episodes[0]!.videoId
      ? updateProgress(null, id, { type: "playback", position: 65, duration: 0 }, 100)
      : null,
  );
  const page = mocks.factory!();
  await page.init();
  expect(page.featuredButtonLabel).toBe("Resume at 1:05");
  page.destroy();
});

it("refreshes resumed activity and watched dates without clearing the search", async () => {
  const page = mocks.factory!();
  await page.init();
  page.query = "Big Bang";
  mocks.refreshProgress.mockResolvedValue([
    updateProgress(null, episodes[0]!.videoId, { type: "complete" }, 100),
    updateProgress(
      null,
      episodes[2]!.videoId,
      { type: "playback", position: 90, duration: 600 },
      200,
    ),
  ]);
  await page.refreshProgress();
  expect(page.query).toBe("Big Bang");
  expect(page.completionLabel).toBe("1 of 16 episodes watched");
  expect(page.currentEpisode.videoId).toBe(episodes[2]!.videoId);
  expect(page.featuredButtonLabel).toBe("Resume at 1:30");
  expect(page.episodes[0].watchedDateTime).toBe(new Date(100).toISOString());
  expect(page.currentEpisode.lastWatchDateTime).toBe(new Date(200).toISOString());
  page.destroy();
});

it("updates every card and removes the feature after marking the course complete", async () => {
  const page = mocks.factory!();
  await page.init();
  mocks.updateProgress.mockImplementation(async (id: string) =>
    updateProgress(null, id, { type: "complete" }, 300),
  );
  await page.markCourseComplete();
  expect(mocks.updateProgress).toHaveBeenCalledTimes(16);
  expect(page.courseComplete).toBe(true);
  expect(page.hasFeaturedEpisode).toBe(false);
  expect(
    page.episodes.every(
      (episode: { watchedDateTime: string }) =>
        episode.watchedDateTime === new Date(300).toISOString(),
    ),
  ).toBe(true);
  expect(page.completionMessage).toBe("Course marked complete.");
  expect(mocks.focusCompletion).toHaveBeenCalledOnce();
  page.destroy();
});

it("resets history only after confirmation and refreshes card states", async () => {
  mocks.loadProgress.mockImplementation(async (id: string) =>
    id === episodes[0]!.videoId ? updateProgress(null, id, { type: "complete" }, 100) : null,
  );
  const page = mocks.factory!();
  await page.init();
  await page.resetWatchHistory();
  expect(mocks.updateProgress).not.toHaveBeenCalled();
  mocks.updateProgress.mockImplementation(async (id: string) =>
    updateProgress(null, id, { type: "reset" }, 300),
  );
  await page.requestResetHistory();
  await page.resetWatchHistory();
  expect(page.completionLabel).toBe("0 of 16 episodes watched");
  expect(page.hasFeaturedEpisode).toBe(false);
  expect(
    page.episodes.every((episode: { status: string }) => episode.status === "Not started"),
  ).toBe(true);
  expect(page.resetPending).toBe(false);
  expect(page.completionMessage).toBe("Watch history reset.");
  expect(mocks.refreshProgress).not.toHaveBeenCalled();
  page.destroy();
});

it("keeps reset and whole-course completion mutually exclusive and supports canceling", async () => {
  const page = mocks.factory!();
  await page.init();
  await page.requestResetHistory();
  await page.markCourseComplete();
  expect(mocks.updateProgress).not.toHaveBeenCalled();
  await page.cancelResetHistory();
  expect(page.resetPending).toBe(false);
  page.markingComplete = true;
  await page.requestResetHistory();
  expect(page.resetPending).toBe(false);
  page.destroy();
});

it("retains visible history and allows retry when resetting fails", async () => {
  mocks.loadProgress.mockImplementation(async (id: string) =>
    id === episodes[0]!.videoId ? updateProgress(null, id, { type: "complete" }, 100) : null,
  );
  const page = mocks.factory!();
  await page.init();
  mocks.updateProgress.mockRejectedValue(new Error("reset failed"));
  await page.requestResetHistory();
  await page.resetWatchHistory();
  expect(page.resettingHistory).toBe(false);
  expect(page.resetPending).toBe(true);
  expect(page.completionLabel).toBe("1 of 16 episodes watched");
  expect(page.completionMessage).toBe("We couldn’t reset the watch history. Please try again.");
  page.destroy();
});
