import { beforeEach, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import { parseCatalog, parseDetail } from "../domain/course";
import { updateProgress } from "../../learning/domain/progress";
import { createCatalogPage } from "./catalog-component";
import { progressStore } from "../../learning/infrastructure/browser-progress";
vi.mock("../../learning/infrastructure/browser-progress", () => ({
  progressStore: { list: vi.fn().mockResolvedValue([]), warning: "" },
}));
const files = import.meta.glob("../../../public/data/courses/*.json", {
  eager: true,
  import: "default",
});
vi.mock("../infrastructure/static-catalog", () => ({
  loadCatalog: async () => parseCatalog(catalog),
  loadDetail: async (course: ReturnType<typeof parseCatalog>[number]) =>
    parseDetail(files[`../../../public/data/courses/${course.id}.json`], course),
}));
beforeEach(() => vi.spyOn(progressStore, "list").mockResolvedValue([]));
it("combines collection, search, subject and progress filters without leaking recent courses", async () => {
  const records = [
    updateProgress(null, "A_QINscHY3Q", { type: "complete" }, 100),
    updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 200),
  ];
  vi.spyOn(progressStore, "list").mockResolvedValue(records);
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
  vi.spyOn(progressStore, "list").mockResolvedValue(
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
