import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import detail from "../../../public/data/courses/big-history.json";
import { parseCatalog, parseDetail } from "../domain/course";
import { updateProgress } from "../../learning/domain/progress";

const mocks = vi.hoisted(() => ({
  factory: undefined as undefined | (() => any),
  loadProgress: vi.fn(),
  stopRestore: vi.fn(),
}));
vi.mock("@alpinejs/csp", () => ({
  default: {
    data: (_name: string, factory: () => any) => {
      mocks.factory = factory;
    },
    start: vi.fn(),
  },
}));
vi.mock("../../site/reload-on-restore", () => ({
  refreshOnRestore: () => mocks.stopRestore,
}));
vi.mock("../../learning/infrastructure/browser-progress", () => ({
  progressStore: { load: mocks.loadProgress, warning: "" },
}));
vi.mock("../infrastructure/static-catalog", () => ({
  loadCatalog: async () => parseCatalog(catalog),
  loadDetail: async (course: ReturnType<typeof parseCatalog>[number]) =>
    parseDetail(detail, course),
}));
import "./course-page";

const course = parseCatalog(catalog).find((item) => item.id === "big-history")!;
const episodes = parseDetail(detail, course).episodes;
let media: EventTarget & { matches: boolean };
beforeEach(() => {
  media = Object.assign(new EventTarget(), { matches: true });
  vi.stubGlobal("window", {
    matchMedia: () => media,
    location: { search: "?id=big-history" },
  });
  vi.stubGlobal("document", { title: "" });
  mocks.loadProgress.mockResolvedValue(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("shows the whole mobile course, restores desktop spreads on resize, and removes its listener", async () => {
  const page = mocks.factory!();
  await page.init();
  expect(page.error).toBe("");
  expect(page.chapterEpisodes).toHaveLength(16);
  expect(page.hasCourseActivity).toBe(false);
  await page.nextSpread();
  expect(page.spread).toBe(0);
  media.matches = false;
  media.dispatchEvent(new Event("change"));
  expect(page.mobileLayout).toBe(false);
  expect(page.chapterEpisodes).toHaveLength(4);
  page.spread = 1;
  media.matches = true;
  media.dispatchEvent(new Event("change"));
  expect(page.chapterEpisodes).toHaveLength(16);
  page.destroy();
  media.matches = false;
  media.dispatchEvent(new Event("change"));
  expect(page.mobileLayout).toBe(true);
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
  expect(page.resumeLabel).toBe("Pick up where you left off");
  expect(page.chapterEpisodes[0].status).toBe("Completed");
  expect(page.chapterEpisodes[7].status).toBe("In progress");
  expect(page.chapterEpisodes.at(-1).number).toBe(16);
  page.destroy();
});

it("offers the next episode after completion and watch again after completing the course", async () => {
  mocks.loadProgress.mockImplementation(async (id: string) =>
    id === episodes[0]!.videoId ? updateProgress(null, id, { type: "complete" }, 100) : null,
  );
  const page = mocks.factory!();
  await page.init();
  expect(page.currentEpisode.videoId).toBe(episodes[1]!.videoId);
  expect(page.hasCourseActivity).toBe(true);
  mocks.loadProgress.mockImplementation(async (id: string) =>
    updateProgress(null, id, { type: "complete" }, 200),
  );
  await page.load();
  expect(page.courseComplete).toBe(true);
  expect(page.resumeLabel).toBe("Watch again");
  expect(page.currentEpisode.videoId).toBe(episodes[0]!.videoId);
  page.destroy();
});
