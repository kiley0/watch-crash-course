import { expect, it, vi } from "vite-plus/test";
import { completeCourse } from "./complete-course";
import { createProgressStore } from "../infrastructure/progress-store";
import { updateProgress } from "../domain/progress";
import type { VideoProgress } from "../domain/progress";

it("completes every unfinished episode while preserving existing completions and saved positions", async () => {
  const first = "E7CwqNHn_Ns",
    second = "WAIUkjsZ5xQ",
    third = "SZbdK9e9bxs";
  const completed = updateProgress(
    null,
    first,
    { type: "playback", position: 80, duration: 100, ended: true },
    100,
  );
  const partial = updateProgress(
    null,
    second,
    { type: "playback", position: 30, duration: 100 },
    200,
  );
  const values = new Map<string, VideoProgress>([
    [`video:${first}`, completed],
    [`video:${second}`, partial],
  ]);
  const write = vi.fn(async (key: string, value: VideoProgress) => {
    values.set(key, value);
  });
  const backend = {
    keys: async () => [...values.keys()],
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: write,
  };
  const result = await completeCourse([first, second, third], createProgressStore(backend));
  expect(result.every((record) => record.completed)).toBe(true);
  expect(result[0]).toEqual(completed);
  expect(result[1]).toMatchObject({ position: 30, duration: 100, completionSource: "manual" });
  expect(result[2]).toMatchObject({ videoId: third, completionSource: "manual" });
  expect(write).toHaveBeenCalledTimes(2);
  const reloaded = createProgressStore(backend);
  for (const id of [first, second, third]) expect((await reloaded.load(id))?.completed).toBe(true);
});
it("retains temporary completion and the storage warning when persistence fails", async () => {
  const store = createProgressStore({
    keys: async () => [],
    getItem: async () => null,
    setItem: async () => {
      throw new Error("blocked");
    },
  });
  const records = await completeCourse(["E7CwqNHn_Ns", "WAIUkjsZ5xQ"], store);
  expect(records.every((record) => record.completed)).toBe(true);
  expect(store.warning).toContain("temporary");
});
