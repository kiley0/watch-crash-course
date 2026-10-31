import { parseBackup } from "../domain/backup";
import type { Backup } from "../domain/backup";
import type { StorageSnapshot } from "../../site/infrastructure/storage-coordinator";
interface DataStorage {
  snapshot(): Promise<StorageSnapshot>;
  replace(snapshot: StorageSnapshot): Promise<void>;
}
export function createDataRepository(storage: DataStorage) {
  return {
    async export(): Promise<Backup> {
      const snapshot = await storage.snapshot();
      for (const [key, value] of snapshot) {
        if (
          !value ||
          typeof value !== "object" ||
          key !== "video:" + (value as { videoId?: unknown }).videoId
        )
          throw new Error("Unrecognized watch data. Nothing was changed.");
      }
      return parseBackup({
        format: "watch-crash-course",
        version: 1,
        exportedAt: Date.now(),
        videos: snapshot.map((entry) => entry[1]),
      });
    },
    async import(value: Backup) {
      const backup = parseBackup(value);
      await storage.replace(backup.videos.map((record) => ["video:" + record.videoId, record]));
    },
    async clear() {
      await storage.replace([]);
    },
  };
}
