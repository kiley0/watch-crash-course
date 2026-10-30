import { describe, expect, it } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import detail from "../../../public/data/courses/study-skills.json";
import { isCourseId, parseCatalog, parseDetail } from "./course";

describe("curated catalog contracts", () => {
  it("uses one course-ID rule for catalog records and navigation", () => {
    for (const id of ["study-skills", "biology", "history-2"]) expect(isCourseId(id)).toBe(true);
    for (const id of ["", "../study-skills", "Study-Skills", "study--skills", "study/skills"])
      expect(isCourseId(id)).toBe(false);
  });
  it("publishes the complete ordered pilot course", () => {
    const [course] = parseCatalog(catalog);
    const parsed = parseDetail(detail, course!);
    expect(parsed.episodes).toHaveLength(10);
    expect(parsed.episodes[0]?.videoId).toBe("E7CwqNHn_Ns");
    expect(parsed.episodes[9]?.title).toBe("Exercise");
  });
  it("rejects impossible review dates while allowing leap days", () => {
    for (const reviewedAt of ["2026-99-99", "2026-02-30", "2025-02-29"])
      expect(() => parseCatalog([{ ...catalog[0], reviewedAt }])).toThrow("Invalid review date");
    expect(parseCatalog([{ ...catalog[0], reviewedAt: "2024-02-29" }])[0]?.reviewedAt).toBe(
      "2024-02-29",
    );
  });
  it("rejects duplicate IDs and untrusted source URLs", () => {
    expect(() => parseCatalog([catalog[0], catalog[0]])).toThrow();
    expect(() => parseCatalog([{ ...catalog[0], id: "../elsewhere" }])).toThrow();
    expect(() => parseCatalog([{ ...catalog[0], sourceUrl: "javascript:alert(1)" }])).toThrow();
    expect(() =>
      parseCatalog([{ ...catalog[0], sourceUrl: "https://thecrashcourse.com.evil.example/" }]),
    ).toThrow();
  });
  it("rejects missing episodes, wrong course, duplicate videos, and broken ordering", () => {
    const course = parseCatalog(catalog)[0]!;
    expect(() => parseDetail({ ...detail, episodes: detail.episodes.slice(1) }, course)).toThrow();
    expect(() => parseDetail({ ...detail, courseId: "other" }, course)).toThrow();
    expect(() =>
      parseDetail({ ...detail, episodes: [...detail.episodes].reverse() }, course),
    ).toThrow();
    const duplicate = structuredClone(detail);
    duplicate.episodes[1]!.videoId = duplicate.episodes[0]!.videoId;
    expect(() => parseDetail(duplicate, course)).toThrow();
  });
});
