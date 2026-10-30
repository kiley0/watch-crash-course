import { describe, expect, it } from "vite-plus/test";
import { matchesQuery } from "./search";

describe("catalog search", () => {
  it("matches whitespace-separated search terms across title, subject, and host", () => {
    expect(matchesQuery("  SKILLS frank  ", "Study Skills", "Thomas Frank")).toBe(true);
    expect(matchesQuery("", "Study Skills")).toBe(true);
    expect(matchesQuery("biology", "Study Skills")).toBe(false);
  });
});
