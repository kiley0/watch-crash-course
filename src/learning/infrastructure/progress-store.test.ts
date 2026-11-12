import { describe, expect, it, vi } from "vite-plus/test";
import { createProgressStore } from "./progress-store";
import { updateProgress } from "../domain/progress";
import type { VideoProgress } from "../domain/progress";
const id = "E7CwqNHn_Ns";
function backend() {
  const values = new Map<string, VideoProgress>();
  return {
    values,
    keys: vi.fn(async () => [...values.keys()]),
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
  it("enumerates persisted and temporary records without knowing a catalog", async () => {
    const disk = backend();
    const saved = updateProgress(null, id, { type: "complete" }, 1);
    disk.values.set(`video:${id}`, saved);
    disk.values.set("unrelated", saved);
    const store = createProgressStore(disk);
    expect(await store.list()).toEqual([saved]);
    disk.setItem.mockRejectedValue(new Error("quota"));
    await store.update("WAIUkjsZ5xQ", { type: "complete" });
    expect(await store.list()).toHaveLength(2);
    expect(disk.getItem).not.toHaveBeenCalledWith("unrelated");
  });
  it("preserves good history when one stored record is invalid", async () => {
    const disk = backend();
    disk.values.set(`video:${id}`, updateProgress(null, id, { type: "complete" }, 1));
    disk.getItem.mockImplementation(async (key) =>
      key.endsWith("WAIUkjsZ5xQ")
        ? ({ schemaVersion: 99 } as unknown as VideoProgress)
        : (disk.values.get(key) ?? null),
    );
    disk.keys.mockResolvedValue([`video:${id}`, "video:WAIUkjsZ5xQ"]);
    const store = createProgressStore(disk);
    expect(await store.list()).toHaveLength(1);
    expect(store.warning).toContain("not be overwritten");
    expect(disk.setItem).not.toHaveBeenCalled();
  });
  it("retains in-memory progress if key enumeration fails", async () => {
    const disk = backend();
    const store = createProgressStore(disk);
    await store.update(id, { type: "complete" });
    disk.keys.mockRejectedValue(new Error("blocked"));
    expect(await store.list()).toHaveLength(1);
    expect(store.warning).toContain("history couldn’t be read");
  });
  it("queues updates behind a pending history read", async () => {
    const disk = backend();
    let release!: (value: VideoProgress | null) => void;
    const pending = new Promise<VideoProgress | null>((resolve) => {
      release = resolve;
    });
    disk.values.set(
      `video:${id}`,
      updateProgress(null, id, { type: "playback", position: 25, duration: 100 }, 1),
    );
    disk.getItem.mockImplementationOnce(() => pending);
    const store = createProgressStore(disk);
    const history = store.list();
    await vi.waitFor(() => expect(disk.getItem).toHaveBeenCalledOnce());
    const update = store.update(id, { type: "complete" });
    await Promise.resolve();
    expect(disk.getItem).toHaveBeenCalledOnce();
    release(disk.values.get(`video:${id}`)!);
    await history;
    await update;
    expect((await store.load(id))?.completed).toBe(true);
    expect((await store.list())[0]?.completed).toBe(true);
    expect(disk.values.get(`video:${id}`)?.completed).toBe(true);
  });
  it("refreshes changed and deleted cached records after another page writes", async () => {
    const disk = backend();
    const store = createProgressStore(disk);
    await store.update(id, { type: "playback", position: 20, duration: 100 });
    disk.values.set(`video:${id}`, updateProgress(null, id, { type: "complete" }, 2));
    expect((await store.refresh())[0]?.completed).toBe(true);
    expect((await store.load(id))?.completed).toBe(true);
    disk.values.clear();
    expect(await store.refresh()).toEqual([]);
    expect(await store.load(id)).toBeNull();
  });
  it("retains temporary records and cached records if refresh fails", async () => {
    const disk = backend();
    const store = createProgressStore(disk);
    await store.update(id, { type: "complete" });
    disk.keys.mockRejectedValue(new Error("blocked"));
    expect((await store.refresh())[0]?.completed).toBe(true);
    expect(store.warning).toContain("retained");
    disk.keys.mockResolvedValue([]);
    expect(await store.refresh()).toHaveLength(1);
    const temporary = createProgressStore({
      ...disk,
      setItem: async () => {
        throw new Error("quota");
      },
    });
    await temporary.update(id, { type: "complete" });
    expect(await temporary.refresh()).toHaveLength(1);
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
