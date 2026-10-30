import { parseProgress, updateProgress } from "../domain/progress";
import type { ProgressEvent, VideoProgress } from "../domain/progress";

// The small boundary also lets tests exercise unavailable and failing storage.
export interface ProgressBackend {
  keys(): Promise<string[]>;
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: VideoProgress): Promise<unknown>;
}
export function createProgressStore(backend: ProgressBackend) {
  const memory = new Map<string, VideoProgress | null>();
  let queue = Promise.resolve();
  let warning = "";
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  async function read(videoId: string): Promise<VideoProgress | null> {
    if (memory.has(videoId)) return memory.get(videoId)!;
    let value: VideoProgress | null = null;
    try {
      value = parseProgress(await backend.getItem(`video:${videoId}`), videoId);
    } catch {
      warning =
        "Saved progress couldn’t be read. Changes are temporary in this tab; existing saved data will not be overwritten.";
    }
    memory.set(videoId, value);
    return value;
  }
  return {
    get warning() {
      return warning;
    },
    load(videoId: string): Promise<VideoProgress | null> {
      return enqueue(() => read(videoId));
    },
    list(): Promise<VideoProgress[]> {
      // Reads and writes share a queue so a late read cannot replace newer cached progress.
      return enqueue(async () => {
        let keys: string[] = [];
        try {
          keys = await backend.keys();
        } catch {
          warning =
            "Saved history couldn’t be read. Changes are temporary in this tab; existing saved data will not be overwritten.";
        }
        const ids = new Set([
          ...memory.keys(),
          ...keys.filter((key) => /^video:[A-Za-z0-9_-]{11}$/.test(key)).map((key) => key.slice(6)),
        ]);
        const records = await Promise.all([...ids].map(read));
        return records.filter((record): record is VideoProgress => record !== null);
      });
    },
    update(videoId: string, event: ProgressEvent): Promise<VideoProgress> {
      return enqueue(async () => {
        const next = updateProgress(await read(videoId), videoId, event, Date.now());
        memory.set(videoId, next);
        if (!warning) {
          try {
            await backend.setItem(`video:${videoId}`, next);
          } catch {
            warning =
              "Progress can’t be saved in this browser. You can keep watching, but changes are temporary in this tab.";
          }
        }
        return next;
      });
    },
  };
}
