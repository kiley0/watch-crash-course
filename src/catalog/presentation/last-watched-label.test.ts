import { expect, it } from "vite-plus/test";
import { lastWatchedLabel } from "./last-watched-label";

it("uses local calendar days for today and yesterday, even across unequal day lengths", () => {
  const now = new Date(2026, 10, 2, 0, 5).getTime();
  expect(lastWatchedLabel(new Date(2026, 10, 2, 0, 1).getTime(), now)).toBe("today");
  expect(lastWatchedLabel(new Date(2026, 10, 1, 23, 59).getTime(), now)).toBe("yesterday");
  expect(lastWatchedLabel(new Date(2026, 9, 30).getTime(), now)).toBe("3 days ago");
});

it("shows longer relative dates and tolerates a device clock moving backward", () => {
  const now = new Date(2026, 10, 14, 12).getTime();
  expect(lastWatchedLabel(new Date(2026, 9, 31).getTime(), now)).toBe("2 weeks ago");
  expect(lastWatchedLabel(new Date(2026, 7, 14).getTime(), now)).toBe("3 months ago");
  expect(lastWatchedLabel(new Date(2025, 10, 14).getTime(), now)).toBe("last year");
  expect(lastWatchedLabel(now + 86_400_000, now)).toBe("today");
});
