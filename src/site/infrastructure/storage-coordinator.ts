export type StorageSnapshot = [string, unknown][];
export interface StorageBackend {
  keys(): Promise<string[]>;
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<unknown>;
  clear(): Promise<void>;
  removeItem(key: string): Promise<void>;
}
function recoverySnapshot(value: unknown): StorageSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid recovery copy.");
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || !Array.isArray(data.snapshot))
    throw new Error("Unsupported recovery copy.");
  const keys = new Set<string>();
  for (const entry of data.snapshot) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      keys.has(entry[0])
    )
      throw new Error("Invalid recovery record.");
    keys.add(entry[0]);
  }
  return data.snapshot as StorageSnapshot;
}
export function createStorageCoordinator(store: StorageBackend, journal: StorageBackend) {
  let queue = Promise.resolve();
  let initialized = false;
  async function apply(snapshot: StorageSnapshot) {
    await store.clear();
    for (const [key, value] of snapshot) await store.setItem(key, value);
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
    const result: StorageSnapshot = [];
    for (const key of await store.keys()) result.push([key, await store.getItem(key)]);
    return result;
  }
  return {
    store() {
      return {
        keys() {
          return run(() => store.keys());
        },
        getItem<T>(key: string) {
          return run(() => store.getItem<T>(key));
        },
        setItem<T>(key: string, value: T) {
          return run(() => store.setItem(key, value));
        },
      };
    },
    snapshot() {
      return run(snapshot);
    },
    replace(next: StorageSnapshot) {
      return run(async () => {
        const previous = await snapshot();
        // Persist recovery before destructive writes; removing it commits the replacement.
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
