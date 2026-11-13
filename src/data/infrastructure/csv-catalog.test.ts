import { beforeEach, expect, it, vi } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import detail from "../../../public/data/courses/study-skills.json";
import { parseCatalog, parseDetail } from "../../catalog/domain/course";
import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import { csvCatalog } from "./csv-catalog";
vi.mock("../../catalog/infrastructure/static-catalog", () => ({
  loadCatalog: vi.fn(),
  loadDetail: vi.fn(),
}));
const courses = parseCatalog(catalog).slice(0, 2);
beforeEach(() => {
  vi.mocked(loadCatalog).mockReset().mockResolvedValue(courses);
  vi.mocked(loadDetail).mockReset();
});
it("returns available names even if another course fails", async () => {
  vi.mocked(loadDetail)
    .mockResolvedValueOnce(parseDetail(detail, courses[0]!))
    .mockRejectedValueOnce(new Error("offline"));
  const result = await csvCatalog([detail.episodes[0]!.videoId, "unknown0000"]);
  expect(result.episodes.get(detail.episodes[0]!.videoId)?.title).toBe("Taking Notes");
  expect(result.incomplete).toBe(true);
});
it("allows raw progress export when the catalog is offline", async () => {
  vi.mocked(loadCatalog).mockRejectedValue(new Error("offline"));
  const result = await csvCatalog([detail.episodes[0]!.videoId]);
  expect(result.episodes.size).toBe(0);
  expect(result.incomplete).toBe(true);
});
it("does not fetch the catalog for an empty export", async () => {
  expect((await csvCatalog([])).incomplete).toBe(false);
  expect(loadCatalog).not.toHaveBeenCalled();
});
