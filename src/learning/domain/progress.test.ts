import { describe, expect, it } from "vite-plus/test";
import { parseProgress, progressStatus, resumePosition, updateProgress } from "./progress";
const id = "E7CwqNHn_Ns";
describe("watch progress", () => {
  it("clamps positions without mistaking a seek for completion", () => {
    const value = updateProgress(null, id, { type: "playback", position: 999, duration: 100 }, 1);
    expect(value.position).toBe(100);
    expect(value.completed).toBe(false);
    expect(resumePosition(value)).toBe(0);
    expect(
      updateProgress(null, id, { type: "playback", position: NaN, duration: -4 }, 1).position,
    ).toBe(0);
  });
  it("retains a known duration when the player momentarily reports zero", () => {
    const first = updateProgress(null, id, { type: "playback", position: 20, duration: 100 }, 1);
    const next = updateProgress(first, id, { type: "playback", position: 30, duration: 0 }, 2);
    expect(next.duration).toBe(100);
    expect(resumePosition(next)).toBe(30);
    expect(progressStatus(next)).toBe("In progress");
  });
  it("makes completion sticky until an explicit reset", () => {
    const done = updateProgress(null, id, { type: "complete" }, 1);
    const replay = updateProgress(done, id, { type: "playback", position: 20, duration: 100 }, 2);
    expect(replay.completionSource).toBe("manual");
    expect(resumePosition(replay)).toBe(0);
    const reset = updateProgress(replay, id, { type: "reset" }, 3);
    expect(reset.completed).toBe(false);
    expect(reset.position).toBe(0);
    expect(reset.duration).toBe(100);
    expect(progressStatus(reset)).toBe("Not started");
    expect(
      updateProgress(reset, id, { type: "playback", position: 100, duration: 100, ended: true }, 4)
        .completionSource,
    ).toBe("ended");
  });
  it("validates stored records and rejects future schemas without migration", () => {
    const value = updateProgress(null, id, { type: "complete" }, 1);
    expect(parseProgress(value, id)).toEqual(value);
    expect(parseProgress(null, id)).toBeNull();
    for (const invalid of [
      { ...value, schemaVersion: 2 },
      { ...value, position: Infinity },
      { ...value, completed: false },
      { ...value, videoId: "other" },
    ])
      expect(() => parseProgress(invalid, id)).toThrow();
  });
});
