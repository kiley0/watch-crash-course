export type StoreName = "video_progress" | "quiz_attempts";
export type StorageSnapshot = Record<StoreName, [string, unknown][]>;
export interface StorageBackend {
  keys(): Promise<string[]>;
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<unknown>;
  clear(): Promise<void>;
  removeItem(key: string): Promise<void>;
}
const names: StoreName[] = ["video_progress", "quiz_attempts"];
function recoverySnapshot(value: unknown): StorageSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid recovery copy.");
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || !data.snapshot || typeof data.snapshot !== "object")
    throw new Error("Unsupported recovery copy.");
  const snapshot = data.snapshot as StorageSnapshot;
  for (const name of names) {
    if (!Array.isArray(snapshot[name])) throw new Error("Invalid recovery copy.");
    const keys = new Set<string>();
    for (const entry of snapshot[name]) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string" ||
        keys.has(entry[0])
      )
        throw new Error("Invalid recovery record.");
      keys.add(entry[0]);
    }
  }
  return snapshot;
}
export function createStorageCoordinator(
  stores: Record<StoreName, StorageBackend>,
  journal: StorageBackend,
) {
  let queue = Promise.resolve();
  let initialized = false;
  async function apply(snapshot: StorageSnapshot) {
    for (const name of names) {
      await stores[name].clear();
      for (const [key, value] of snapshot[name]) await stores[name].setItem(key, value);
    }
  }
  async function initialize() {
    if (initialized) return;
    const pending = await journal.getItem("pending-replacement");
    if (pending !== null) {
      await apply(recoverySnapshot(pending));
      await journal.removeItem("pending-replacement");
    }
    initialized = true;
  }
  function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(async () => {
      await initialize();
      return operation();
    });
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  async function snapshot(): Promise<StorageSnapshot> {
    const result: StorageSnapshot = { video_progress: [], quiz_attempts: [] };
    for (const name of names)
      for (const key of await stores[name].keys())
        result[name].push([key, await stores[name].getItem(key)]);
    return result;
  }
  return {
    store(name: StoreName) {
      return {
        keys() {
          return run(() => stores[name].keys());
        },
        getItem<T>(key: string) {
          return run(() => stores[name].getItem<T>(key));
        },
        setItem<T>(key: string, value: T) {
          return run(() => stores[name].setItem(key, value));
        },
      };
    },
    snapshot() {
      return run(snapshot);
    },
    replace(next: StorageSnapshot) {
      return run(async () => {
        const previous = await snapshot();
        // Recovery is saved before destructive writes. Removing it is the commit point.
        await journal.setItem("pending-replacement", { version: 1, snapshot: previous });
        try {
          await apply(next);
          await journal.removeItem("pending-replacement");
        } catch {
          initialized = false;
          try {
            await initialize();
          } catch {
            throw new Error(
              "Saving failed. A recovery copy is retained in this browser. Close other site tabs and reload to restore your previous data.",
            );
          }
          throw new Error(
            "Saving failed. Your previous data was restored. Try again when browser storage is available.",
          );
        }
      });
    },
  };
}
