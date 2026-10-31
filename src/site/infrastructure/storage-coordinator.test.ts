import { describe, expect, it } from "vite-plus/test";
import { createStorageCoordinator } from "./storage-coordinator";
import type { StorageBackend, StorageSnapshot } from "./storage-coordinator";
function backend() {
  const data = new Map<string, unknown>();
  return {
    data,
    async keys() {
      return [...data.keys()];
    },
    async getItem<T>(key: string) {
      return (data.get(key) ?? null) as T | null;
    },
    async setItem<T>(key: string, value: T) {
      data.set(key, value);
    },
    async clear() {
      data.clear();
    },
    async removeItem(key: string) {
      data.delete(key);
    },
  };
}
function setup() {
  const videos = backend();
  const quizzes = backend();
  const journal = backend();
  const stores = { video_progress: videos, quiz_attempts: quizzes };
  return { videos, quizzes, journal, stores, storage: createStorageCoordinator(stores, journal) };
}
const next: StorageSnapshot = {
  video_progress: [["video:new", { position: 5 }]],
  quiz_attempts: [["quiz:new", { score: 2 }]],
};
describe("recoverable storage replacement", () => {
  it("replaces both stores, removes missing records, and leaves no recovery copy after commit", async () => {
    const { storage, journal } = setup();
    await storage.store("video_progress").setItem("video:old", { position: 8 });
    await storage.replace(next);
    expect(await storage.snapshot()).toEqual(next);
    expect(journal.data.size).toBe(0);
    await storage.replace({ video_progress: [], quiz_attempts: [] });
    expect((await storage.snapshot()).video_progress).toEqual([]);
  });
  it("never clears current records if the recovery copy cannot be saved", async () => {
    const { stores, journal, videos } = setup();
    videos.data.set("old", 1);
    const storage = createStorageCoordinator(stores, {
      ...journal,
      async setItem() {
        throw new Error("quota");
      },
    });
    await expect(storage.replace(next)).rejects.toThrow("quota");
    expect(videos.data.get("old")).toBe(1);
  });
  it("rolls back both stores after a partial write failure", async () => {
    const { stores, journal, videos, quizzes } = setup();
    videos.data.set("old-video", 1);
    quizzes.data.set("old-quiz", 2);
    let failed = false;
    const broken: StorageBackend = {
      ...quizzes,
      async setItem(key, value) {
        if (!failed) {
          failed = true;
          throw new Error("quota");
        }
        return quizzes.setItem(key, value);
      },
    };
    const storage = createStorageCoordinator({ ...stores, quiz_attempts: broken }, journal);
    await expect(storage.replace(next)).rejects.toThrow("previous data was restored");
    expect(await storage.snapshot()).toEqual({
      video_progress: [["old-video", 1]],
      quiz_attempts: [["old-quiz", 2]],
    });
    expect(journal.data.size).toBe(0);
  });
  it("restores the previous data if the final commit fails", async () => {
    const { stores, journal, videos } = setup();
    videos.data.set("previous", 1);
    let failCommit = true;
    const storage = createStorageCoordinator(stores, {
      ...journal,
      async removeItem(key) {
        if (failCommit) {
          failCommit = false;
          throw new Error("commit failed");
        }
        return journal.removeItem(key);
      },
    });
    await expect(storage.replace(next)).rejects.toThrow("previous data was restored");
    expect(await storage.snapshot()).toEqual({
      video_progress: [["previous", 1]],
      quiz_attempts: [],
    });
    expect(journal.data.size).toBe(0);
  });
  it("recovers an interrupted replacement before any ordinary page reads or writes", async () => {
    const { stores, journal, videos } = setup();
    journal.data.set("pending-replacement", { version: 1, snapshot: next });
    videos.data.set("partial", 9);
    const storage = createStorageCoordinator(stores, journal);
    expect(await storage.store("video_progress").getItem("video:new")).toEqual({ position: 5 });
    expect(await storage.snapshot()).toEqual(next);
    expect(journal.data.size).toBe(0);
  });
  it("retains recovery after rollback also fails and restores on a later page load", async () => {
    const { stores, journal, videos, quizzes } = setup();
    videos.data.set("previous", 1);
    const blocked = {
      ...quizzes,
      async clear() {
        throw new Error("blocked");
      },
    };
    const storage = createStorageCoordinator({ ...stores, quiz_attempts: blocked }, journal);
    await expect(storage.replace(next)).rejects.toThrow("recovery copy is retained");
    expect(journal.data.has("pending-replacement")).toBe(true);
    const recovered = createStorageCoordinator(stores, journal);
    expect(await recovered.snapshot()).toEqual({
      video_progress: [["previous", 1]],
      quiz_attempts: [],
    });
    expect(journal.data.size).toBe(0);
  });
  it("preserves an unreadable recovery record without clearing current data", async () => {
    const { stores, journal, videos } = setup();
    journal.data.set("pending-replacement", { version: 99 });
    videos.data.set("old", 1);
    const storage = createStorageCoordinator(stores, journal);
    await expect(storage.snapshot()).rejects.toThrow("Unsupported");
    expect(videos.data.get("old")).toBe(1);
    expect(journal.data.size).toBe(1);
  });
});
