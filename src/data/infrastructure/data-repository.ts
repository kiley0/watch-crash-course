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
      for (const [key, value] of snapshot.video_progress) {
        if (
          !value ||
          typeof value !== "object" ||
          key !== "video:" + (value as { videoId?: unknown }).videoId
        )
          throw new Error("Unrecognized watch data. Nothing was changed.");
      }
      for (const [key, value] of snapshot.quiz_attempts) {
        const record = value as { videoId?: unknown; revision?: unknown } | null;
        if (!record || key !== "quiz:" + record.videoId + ":r" + record.revision)
          throw new Error("Unrecognized quiz data. Nothing was changed.");
      }
      return parseBackup({
        format: "watch-crash-course",
        version: 1,
        exportedAt: Date.now(),
        videos: snapshot.video_progress.map((entry) => entry[1]),
        quizzes: snapshot.quiz_attempts.map((entry) => entry[1]),
      });
    },
    async import(value: Backup) {
      const backup = parseBackup(value);
      await storage.replace({
        video_progress: backup.videos.map((record) => ["video:" + record.videoId, record]),
        quiz_attempts: backup.quizzes.map((record) => [
          "quiz:" + record.videoId + ":r" + record.revision,
          record,
        ]),
      });
    },
    async clear() {
      await storage.replace({ video_progress: [], quiz_attempts: [] });
    },
  };
}
