import { describe, expect, it, vi } from "vite-plus/test";
import { createProgressStore } from "./progress-store";
import { updateProgress } from "../domain/progress";
import type { VideoProgress } from "../domain/progress";
const id = "E7CwqNHn_Ns";
function backend() {
  const values = new Map<string, VideoProgress>();
  return {
    values,
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: VideoProgress) => {
      values.set(key, value);
    }),
  };
}
describe("local progress adapter", () => {
  it("serializes writes and restores progress in a new page session", async () => {
    const disk = backend();
    const store = createProgressStore(disk);
    await Promise.all([
      store.update(id, { type: "playback", position: 20, duration: 100 }),
      store.update(id, { type: "complete" }),
      store.update(id, { type: "playback", position: 30, duration: 100 }),
    ]);
    const restored = await createProgressStore(disk).load(id);
    expect(restored?.position).toBe(30);
    expect(restored?.completed).toBe(true);
    expect(disk.setItem).toHaveBeenCalledTimes(3);
  });
  it("shares a video's progress regardless of course membership", async () => {
    const disk = backend();
    const store = createProgressStore(disk);
    await store.update(id, { type: "complete" });
    expect((await store.load(id))?.completed).toBe(true);
    expect([...disk.values.keys()]).toEqual([`video:${id}`]);
  });
  it("keeps playback usable in memory if writes are blocked", async () => {
    const disk = backend();
    disk.setItem.mockRejectedValue(new Error("quota"));
    const store = createProgressStore(disk);
    await store.update(id, { type: "playback", position: 20, duration: 100 });
    expect(store.warning).toContain("temporary");
    expect((await store.load(id))?.position).toBe(20);
    await store.update(id, { type: "complete" });
    expect((await store.load(id))?.completed).toBe(true);
    expect(disk.setItem).toHaveBeenCalledTimes(1);
  });
  it("does not overwrite unreadable data or unsupported schemas", async () => {
    for (const brokenRead of [
      () => Promise.reject(new Error("blocked")),
      async () => ({ ...updateProgress(null, id, { type: "complete" }, 1), schemaVersion: 99 }),
    ]) {
      const disk = backend();
      const store = createProgressStore({ ...disk, getItem: brokenRead });
      await store.update(id, { type: "complete" });
      expect(store.warning).toContain("not be overwritten");
      expect(disk.setItem).not.toHaveBeenCalled();
    }
  });
});
