import { expect, it } from "vite-plus/test";
import { learningTimeLabel } from "./learning-time-label";

it("formats learning time with readable units and omits empty units", () => {
  expect(learningTimeLabel(0)).toBe("0 seconds");
  expect(learningTimeLabel(1.9)).toBe("1 second");
  expect(learningTimeLabel(60)).toBe("1 minute");
  expect(learningTimeLabel(3720)).toBe("1 hour and 2 minutes");
  expect(learningTimeLabel(3661)).toBe("1 hour, 1 minute, and 1 second");
});
