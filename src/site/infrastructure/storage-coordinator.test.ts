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
  const records = backend();
  const journal = backend();
  return { records, journal, storage: createStorageCoordinator(records, journal) };
}
const next: StorageSnapshot = [["video:new", { position: 5 }]];
describe("recoverable storage replacement", () => {
  it("replaces records and removes recovery only after commit", async () => {
    const { storage, journal } = setup();
    await storage.store().setItem("video:old", { position: 8 });
    await storage.replace(next);
    expect(await storage.snapshot()).toEqual(next);
    expect(journal.data.size).toBe(0);
    await storage.replace([]);
    expect(await storage.snapshot()).toEqual([]);
  });
  it("never clears current records if the recovery copy cannot be saved", async () => {
    const { records, journal } = setup();
    records.data.set("old", 1);
    const storage = createStorageCoordinator(records, {
      ...journal,
      async setItem() {
        throw new Error("quota");
      },
    });
    await expect(storage.replace(next)).rejects.toThrow("quota");
    expect(records.data.get("old")).toBe(1);
  });
  it("restores all previous records after a partial write failure", async () => {
    const { records, journal } = setup();
    records.data.set("old", 1);
    let failed = false;
    const broken: StorageBackend = {
      ...records,
      async setItem(key, value) {
        if (!failed) {
          failed = true;
          throw new Error("quota");
        }
        return records.setItem(key, value);
      },
    };
    const storage = createStorageCoordinator(broken, journal);
    await expect(storage.replace(next)).rejects.toThrow("previous data was restored");
    expect(await storage.snapshot()).toEqual([["old", 1]]);
    expect(journal.data.size).toBe(0);
  });
  it("restores the previous data if the final commit fails", async () => {
    const { records, journal } = setup();
    records.data.set("previous", 1);
    let failCommit = true;
    const storage = createStorageCoordinator(records, {
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
    expect(await storage.snapshot()).toEqual([["previous", 1]]);
    expect(journal.data.size).toBe(0);
  });
  it("recovers an interrupted replacement before ordinary reads or writes", async () => {
    const { records, journal } = setup();
    journal.data.set("pending-replacement", { version: 1, snapshot: next });
    records.data.set("partial", 9);
    const storage = createStorageCoordinator(records, journal);
    expect(await storage.store().getItem("video:new")).toEqual({ position: 5 });
    expect(await storage.snapshot()).toEqual(next);
    expect(journal.data.size).toBe(0);
  });
  it("retains recovery if rollback fails and restores on a later page load", async () => {
    const { records, journal } = setup();
    records.data.set("previous", 1);
    const blocked = {
      ...records,
      async clear() {
        throw new Error("blocked");
      },
    };
    const storage = createStorageCoordinator(blocked, journal);
    await expect(storage.replace(next)).rejects.toThrow("recovery copy is retained");
    expect(journal.data.has("pending-replacement")).toBe(true);
    expect(await createStorageCoordinator(records, journal).snapshot()).toEqual([["previous", 1]]);
    expect(journal.data.size).toBe(0);
  });
  it("preserves unreadable recovery without clearing current data", async () => {
    const { records, journal } = setup();
    journal.data.set("pending-replacement", { version: 99 });
    records.data.set("old", 1);
    const storage = createStorageCoordinator(records, journal);
    await expect(storage.snapshot()).rejects.toThrow("Unsupported");
    expect(records.data.get("old")).toBe(1);
    expect(journal.data.size).toBe(1);
  });
});
