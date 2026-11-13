import { describe, expect, it } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import detail from "../../../public/data/courses/study-skills.json";
import {
  isCourseId,
  parseCatalog,
  parseDetail,
  playlistForEpisode,
  coursesInCollection,
  collectionLabel,
  libraryUrl,
} from "./course";

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
  it("publishes an episode description throughout the curated catalog", () => {
    for (const course of parseCatalog(catalog)) {
      const detail = parseDetail(
        courseFiles[`../../../public/data/courses/${course.id}.json`],
        course,
      );
      const missing = detail.episodes
        .filter((episode) => !episode.description?.trim())
        .map((episode) => episode.number);
      expect(missing, `${course.id} episodes missing descriptions`).toEqual([]);
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
      ["geography", 50, "93LLwiMjDko", "T_vLXgj2pvo"],
      ["sociology", 44, "YnCJU6PaCio", "KriEIJ0ubh0"],
      ["us-government", 50, "lrk4oY7UxpQ", "PMhIQNkO_Y0"],
      ["organic-chemistry", 50, "PmvLB5dIEp8", "qygFjt2_LG4"],
      ["film-criticism", 15, "qk0-m_LARCY", "KEEnap_h8cs"],
      ["european-history", 50, "rNCw2MOfnLQ", "1hAraGgEiAo"],
      ["world-mythology", 41, "HeX6CX5LEj0", "qmpDK-8ib2Y"],
      ["theater-drama", 50, "sNWrOuwzax8", "4kxzD4ASioI"],
      ["business-soft-skills", 17, "EFeEAtXdzFU", "DJq9zVLu5_Q"],
      ["history-of-science", 46, "YvtCLceNf30", "EhBhP-zk0_I"],
      ["black-american-history", 51, "S72vvfBTQws", "i_OU4EcWQ6I"],
      ["big-history", 16, "tq6be-CZJ3w", "1esRyRV8H2M"],
      ["big-questions-us-government", 6, "dsGoS_M7AW8", "2b-H-rxQ8m8"],
      ["biologia", 50, "tuXWE_U1qIQ", "q3rxrs57BEM"],
      ["biology-2012", 40, "QnQe0xW_JY4", "izRvPaAWgyw"],
      ["botany", 15, "2th5lAd-77A", "eLt9itd3KhA"],
      ["climate-energy", 12, "9PFhrpyWV-w", "3p51wKUuwOU"],
      ["film-production", 15, "TARsoxST0tQ", "02mqlmcZzVs"],
      ["futures-of-ai", 5, "UFJQV5Jb0pY", "iNdZFKfExZ8"],
      ["games", 29, "QPqR2wOs8WI", "bMQprYPlK54"],
      ["geology", 23, "ypH6dR7YGfU", "y5RqfQvCaBY"],
      ["latin-american-literature", 13, "hX6lzkQBmhc", "AA63Dd58fFc"],
      ["literature", 45, "MSYw502dJNY", "dhgEpr87Yac"],
      ["native-american-history", 24, "XHXC0uOLOkA", "2XWGxVuOwJQ"],
      ["outbreak-science", 15, "_qAzXb7mA2g", "Dpah15G3LSA"],
      ["political-theory", 13, "qz2-X1LrOPg", "A0z7Vs1tnZs"],
      ["fundamentos-quimica", 11, "G7wUMpsB5k8", "4DKNv-8EUBI"],
      ["religions", 24, "2RVSmLxyDpM", "KkWD6RsSAc0"],
      ["scientific-thinking", 7, "d2r7Bk1NlgU", "NaMcw8_10Yg"],
      ["sex-ed", 15, "SkSItIS_Xl0", "iNG9UYbZHws"],
      ["world-history-2", 30, "wyzi9GNZFMU", "k7dTDjRnBqU"],
      ["zoology", 14, "zgM0F6UmC70", "rH63obMflyo"],
    ] as const) {
      const course = parseCatalog(catalog).find((course) => course.id === id)!;
      const detail = parseDetail(courseFiles[`../../../public/data/courses/${id}.json`], course);
      expect(detail.episodes).toHaveLength(count);
      expect(detail.episodes[0]?.videoId).toBe(first);
      expect(detail.episodes.at(-1)?.videoId).toBe(last);
    }
  });
  it("keeps the corrected Zoology lessons instead of the preceding website embeds", () => {
    const course = parseCatalog(catalog).find((course) => course.id === "zoology")!;
    const detail = parseDetail(courseFiles["../../../public/data/courses/zoology.json"], course);
    expect(detail.episodes[8]).toMatchObject({
      number: 9,
      title: "Reproduction",
      videoId: "poLyJDVjKlM",
    });
    expect(detail.episodes[10]).toMatchObject({
      number: 11,
      title: "Parasites",
      videoId: "uliiNX1gni8",
    });
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

describe("multi-season playlists", () => {
  it("uses each original playlist on both sides of season boundaries", () => {
    for (const id of ["big-history", "literature"]) {
      const course = parseCatalog(catalog).find((course) => course.id === id)!;
      const detail = parseDetail(courseFiles[`../../../public/data/courses/${id}.json`], course);
      for (const [index, part] of course.playlistParts!.entries()) {
        expect(playlistForEpisode(course, detail.episodes[part.startEpisode - 1]!)).toBe(
          part.playlistId,
        );
        if (index > 0)
          expect(playlistForEpisode(course, detail.episodes[part.startEpisode - 2]!)).toBe(
            course.playlistParts![index - 1]!.playlistId,
          );
      }
    }
  });
  it("rejects gaps at the start, repeated boundaries, and parts outside the course", () => {
    const course = catalog.find((course) => course.id === "big-history")!;
    for (const starts of [
      [2, 11],
      [1, 1],
      [1, 17],
    ]) {
      expect(() =>
        parseCatalog([
          {
            ...course,
            playlistParts: course.playlistParts!.map((part, index) => ({
              ...part,
              startEpisode: starts[index],
            })),
          },
        ]),
      ).toThrow();
    }
  });
});

describe("library collections", () => {
  const courses = parseCatalog(catalog);
  it("keeps the two libraries separate and retains all fifteen Study Hall series", () => {
    const crash = coursesInCollection(courses, "crash-course");
    const studyHall = coursesInCollection(courses, "study-hall");
    expect(crash).toHaveLength(56);
    expect(studyHall).toHaveLength(15);
    expect(studyHall.filter((course) => course.series === "College Foundations")).toHaveLength(11);
    expect(studyHall.filter((course) => course.series === "Original series")).toHaveLength(4);
    expect(studyHall.reduce((sum, course) => sum + course.episodeCount, 0)).toBe(389);
    expect(crash.every((course) => !course.id.startsWith("study-hall-"))).toBe(true);
    for (const course of studyHall) {
      const detail = parseDetail(
        courseFiles[`../../../public/data/courses/${course.id}.json`],
        course,
      );
      expect(detail.episodes.every((episode) => !/preview|trailer/i.test(episode.title))).toBe(
        true,
      );
      expect(collectionLabel(course)).toBe("Study Hall");
      expect(libraryUrl(course)).toBe("./study-hall.html#courses");
    }
    expect(libraryUrl(crash[0]!)).toBe("./index.html#courses");
    expect(collectionLabel(crash[0]!)).toBe("Crash Course");
  });
  it("requires known collections, Study Hall series labels and matching canonical sources", () => {
    const studyHall = coursesInCollection(courses, "study-hall")[0]!;
    expect(() => parseCatalog([{ ...studyHall, collection: "other" }])).toThrow();
    expect(() => parseCatalog([{ ...studyHall, series: "other" }])).toThrow();
    expect(() => parseCatalog([{ ...studyHall, series: undefined }])).toThrow();
    for (const sourceUrl of [
      "https://evil.example/",
      "https://www.youtube.com/playlist?list=wrong",
      studyHall.sourceUrl + "&extra=true",
    ]) {
      expect(() => parseCatalog([{ ...studyHall, sourceUrl }])).toThrow();
    }
  });
});

it("retains each Study Hall course’s verified playlist endpoints", () => {
  const courses = parseCatalog(catalog);
  for (const [id, count, first, last] of [
    ["study-hall-statistics", 31, "CJbEOMuMWUM", "SLiYq7OZ8jc"],
    ["study-hall-sustainability", 31, "7eiiMrj6VYU", "rCe-Xdyivjw"],
    ["study-hall-macroeconomics", 31, "NJcjgcifdIg", "nsj6AfbnpZk"],
    ["study-hall-psychology", 30, "sYO7f2WozAY", "PRzkyHyhekA"],
    ["study-hall-modern-world-history", 30, "r-n_NR_uwCs", "0xKL0Z4rRyM"],
    ["study-hall-programming", 28, "zDsD5s3GO-A", "yTzuRFjFivg"],
    ["study-hall-us-government", 30, "nJzJ9eAvKSI", "RbswqbHzIqs"],
    ["study-hall-us-history", 30, "Gnv6mQC0sQY", "7q9xGQja4To"],
    ["study-hall-communication", 29, "pb_7CakHevo", "V2hSG06Nmjs"],
    ["study-hall-college-math", 30, "ovu51n3qjeU", "GltOrM94EtA"],
    ["study-hall-rhetoric-composition", 29, "UeGesJgnNH4", "t6ECrgO_YKg"],
    ["study-hall-composition", 15, "AXa22Csh7oE", "-Cx_DL43JgI"],
    ["study-hall-algebra", 15, "A_QINscHY3Q", "FWAiaCOSevY"],
    ["study-hall-chemistry", 15, "VWSqD2L8BLs", "IBb5J0tmKP8"],
    ["study-hall-data-literacy", 15, "yhO_t-c3yJY", "HMYpfwItUiY"],
  ] as const) {
    const course = courses.find((course) => course.id === id)!;
    const detail = parseDetail(
      courseFiles[`../../../public/data/courses/${course.id}.json`],
      course,
    );
    expect(detail.episodes).toHaveLength(count);
    expect(detail.episodes[0]?.videoId).toBe(first);
    expect(detail.episodes.at(-1)?.videoId).toBe(last);
  }
});

it("requires a matching canonical YouTube source for Study Hall lessons", () => {
  const course = parseCatalog(catalog).find((course) => course.id === "study-hall-algebra")!;
  const detail = parseDetail(courseFiles[`../../../public/data/courses/${course.id}.json`], course);
  for (const sourceUrl of [
    "https://thecrashcourse.com/courses/not-a-study-hall-lesson/",
    "https://www.youtube.com/watch?v=wrongvideo1",
    `${detail.episodes[0]!.sourceUrl}&extra=true`,
  ]) {
    const copy = structuredClone(detail);
    copy.episodes[0]!.sourceUrl = sourceUrl;
    expect(() => parseDetail(copy, course)).toThrow("Study Hall episode source");
  }
});

it("preserves optional episode descriptions and rejects invalid supplied values", () => {
  const course = parseCatalog(catalog).find((course) => course.id === "study-skills")!;
  const raw = structuredClone(courseFiles[`../../../public/data/courses/${course.id}.json`]) as {
    episodes: { description?: unknown }[];
  };
  const detail = parseDetail(raw, course);
  expect(detail.episodes.every((episode) => typeof episode.description === "string")).toBe(true);
  delete raw.episodes[0]!.description;
  expect(parseDetail(raw, course).episodes[0]!.description).toBeUndefined();
  for (const invalid of ["", "  ", null, 42]) {
    raw.episodes[0]!.description = invalid;
    expect(() => parseDetail(raw, course)).toThrow();
  }
});
