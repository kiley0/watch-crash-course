import { afterEach, expect, it, vi } from "vite-plus/test";
import { readPlaybackSpeed, savePlaybackSpeed } from "./playback-speed";
afterEach(() => vi.unstubAllGlobals());
it("defaults safely when storage is missing or invalid", () => {
  for (const value of [null, "", "garbage", "0", "-1", "Infinity", "5"]) {
    vi.stubGlobal("localStorage", { getItem: () => value });
    expect(readPlaybackSpeed()).toBe(1);
  }
});
it("accepts saved speeds and tolerates unavailable storage", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "1.75",
    setItem: () => {
      throw new Error("blocked");
    },
  });
  expect(readPlaybackSpeed()).toBe(1.75);
  expect(() => savePlaybackSpeed(2)).not.toThrow();
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  expect(readPlaybackSpeed()).toBe(1);
});
