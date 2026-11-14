import { expect, it, vi } from "vite-plus/test";
import { resetCourse } from "./reset-course";
import { createProgressStore } from "../infrastructure/progress-store";
import { updateProgress } from "../domain/progress";
import type { VideoProgress } from "../domain/progress";
import { viewingHistory } from "../domain/course-summary";

it("resets completed and partial episodes, preserves unrelated history, and skips unstarted videos", async () => {
  const first = "E7CwqNHn_Ns",
    second = "WAIUkjsZ5xQ",
    third = "SZbdK9e9bxs",
    unrelated = "tq6be-CZJ3w";
  const records = [
    updateProgress(null, first, { type: "complete" }, 100),
    updateProgress(null, second, { type: "playback", position: 50, duration: 100 }, 200),
    updateProgress(null, unrelated, { type: "complete" }, 300),
  ];
  const values = new Map(records.map((record) => [`video:${record.videoId}`, record]));
  const write = vi.fn(async (key: string, value: VideoProgress) => {
    values.set(key, value);
  });
  const backend = {
    keys: async () => [...values.keys()],
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: write,
  };
  const store = createProgressStore(backend);
  await resetCourse([first, second, third, first], store);
  expect(write).toHaveBeenCalledTimes(2);
  const reloaded = createProgressStore(backend);
  expect(viewingHistory(await reloaded.list()).map((record) => record.videoId)).toEqual([
    unrelated,
  ]);
  expect(await reloaded.load(first)).toMatchObject({
    position: 0,
    completed: false,
    completionSource: null,
  });
  expect(await reloaded.load(second)).toMatchObject({
    position: 0,
    completed: false,
    completionSource: null,
  });
  expect(await reloaded.load(third)).toBeNull();
});

it("keeps the reset in memory and reports when storage cannot save it", async () => {
  const store = createProgressStore({
    keys: async () => ["video:E7CwqNHn_Ns"],
    getItem: async () => updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 100),
    setItem: async () => {
      throw new Error("blocked");
    },
  });
  await resetCourse(["E7CwqNHn_Ns"], store);
  expect(viewingHistory(await store.list())).toEqual([]);
  expect(store.warning).toContain("temporary");
});
