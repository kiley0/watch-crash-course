import { describe, expect, it } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import detail from "../../../public/data/courses/study-skills.json";
import { isCourseId, parseCatalog, parseDetail } from "./course";

const courseFiles = import.meta.glob("../../../public/data/courses/*.json", {
  eager: true,
  import: "default",
});

describe("curated catalog contracts", () => {
  it("publishes a validated detail file for every catalog course, with no orphan files", () => {
    const courses = parseCatalog(catalog);
    expect(
      Object.keys(courseFiles)
        .map((path) => path.split("/").at(-1)!)
        .toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(courses.map((course) => `${course.id}.json`).toSorted((a, b) => a.localeCompare(b)));
    for (const course of courses) {
      const detail = parseDetail(
        courseFiles[`../../../public/data/courses/${course.id}.json`],
        course,
      );
      expect(detail.episodes).toHaveLength(course.episodeCount);
    }
  });
  it("keeps complete curated series anchored to their verified endpoints", () => {
    for (const [id, count, first, last] of [
      ["world-history", 42, "Yocja_N5s1I", "s_iwrt7D5OA"],
      ["biology", 50, "tZE_fQFK8EY", "SyHM1gFyP8Y"],
      ["astronomy", 46, "0rHUDWjR5gg", "mgdq6DOTU3M"],
      ["philosophy", 46, "1A_CAkYt3GY", "Ra1Dmz-5HjU"],
      ["computer-science", 40, "O5nskjZ_GoI", "5TNAz1HYg18"],
      ["chemistry", 46, "FSyAehMdpyI", "aLuSi_6Ol8M"],
      ["psychology", 40, "vo4pMVb0R6M", "XoTx7Rt4dig"],
      ["economics", 35, "3ez10ADR_gM", "O-t8-Vq0HO0"],
      ["us-history", 47, "6E9WU9TGrec", "lUfh2ebjLOg"],
      ["physics", 46, "ZM8ECpBuQYE", "VYxYuaDvdM0"],
      ["linguistics", 16, "3yLXNzDUH58", "-sUUWyo4RZQ"],
      ["statistics", 44, "sxQaBpKfDRk", "uJFdLKkuYc4"],
      ["media-literacy", 12, "AD7N-1Mj-DU", "Q_aXzpeam0s"],
      ["ecology", 12, "sjE-Pkjp3u4", "Kaeyr5-O2eU"],
      ["art-history", 22, "t6Wc7OMks4U", "eTlGeL6Yeas"],
      ["anatomy-physiology", 47, "uBGl2BujkPQ", "rd2cf5hValM"],
      ["engineering", 46, "btGYcizV0iI", "Fzq_yuj-oZM"],
      ["artificial-intelligence", 20, "a0_lo_GDcFw", "T7Rv4tGRlfc"],
      ["navigating-digital-information", 10, "pLlv2o6UfTU", "M5YKW6fhlss"],
      ["intellectual-property", 7, "RQOJgEA5e1k", "MCodRWoavoc"],
      ["public-health", 10, "5aww-Bpgkf4", "VvRr0oL6s_E"],
      ["film-history", 16, "vsnB4iBb78o", "cCY-4NxXCU8"],
      ["entrepreneurship", 17, "aozlwC3XwfY", "pqPvwTvvnaY"],
    ] as const) {
      const course = parseCatalog(catalog).find((course) => course.id === id)!;
      const detail = parseDetail(courseFiles[`../../../public/data/courses/${id}.json`], course);
      expect(detail.episodes).toHaveLength(count);
      expect(detail.episodes[0]?.videoId).toBe(first);
      expect(detail.episodes.at(-1)?.videoId).toBe(last);
    }
  });
  it("accepts canonical episode upload sources only for the matching video", () => {
    const course = parseCatalog(catalog)[0]!;
    const copy = structuredClone(detail);
    copy.episodes[0]!.sourceUrl = `https://www.youtube.com/watch?v=${copy.episodes[0]!.videoId}`;
    expect(parseDetail(copy, course).episodes[0]?.sourceUrl).toBe(copy.episodes[0]!.sourceUrl);
    for (const sourceUrl of [
      "https://www.youtube.com/watch?v=WAIUkjsZ5xQ",
      "https://www.youtube.com/watch?v=E7CwqNHn_Ns&list=unreviewed",
      "https://www.youtube.com.evil.example/watch?v=E7CwqNHn_Ns",
      "https://www.youtube.com/redirect?q=https://example.com",
      "javascript:alert(1)",
    ]) {
      copy.episodes[0]!.sourceUrl = sourceUrl;
      expect(() => parseDetail(copy, course)).toThrow("Invalid source link");
    }
    expect(() =>
      parseCatalog([{ ...course, sourceUrl: "https://www.youtube.com/watch?v=E7CwqNHn_Ns" }]),
    ).toThrow();
  });
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
