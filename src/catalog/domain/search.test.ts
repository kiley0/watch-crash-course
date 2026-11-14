import { describe, expect, it } from "vite-plus/test";
import { matchesQuery, parseCourseSearch } from "./search";

describe("catalog search", () => {
  it("matches whitespace-separated search terms across title, subject, and host", () => {
    expect(matchesQuery("  SKILLS frank  ", "Study Skills", "Thomas Frank")).toBe(true);
    expect(matchesQuery("", "Study Skills")).toBe(true);
    expect(matchesQuery("biology", "Study Skills")).toBe(false);
  });
});

it("validates episode-search data without accepting empty or malformed indexes", () => {
  expect(parseCourseSearch({ botany: "Leaves and photosynthesis" })).toEqual({
    botany: "Leaves and photosynthesis",
  });
  for (const invalid of [null, [], {}, { "../botany": "leaves" }, { botany: [] }, { botany: " " }])
    expect(() => parseCourseSearch(invalid)).toThrow("search index");
});
