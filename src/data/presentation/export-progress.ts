import { progressCsv } from "../domain/progress-csv";
import { csvCatalog } from "../infrastructure/csv-catalog";
import { MAX_BACKUP_BYTES } from "../domain/backup";
import { createDataRepository } from "../infrastructure/data-repository";
import { browserStorage } from "../../site/infrastructure/browser-storage";
const repository = createDataRepository(browserStorage);
export async function exportProgress(format: "json" | "csv") {
  const backup = await repository.export();
  const catalog =
    format === "csv" ? await csvCatalog(backup.videos.map((record) => record.videoId)) : null;
  const blob =
    format === "csv"
      ? new Blob([progressCsv(backup, catalog!.episodes)], { type: "text/csv;charset=utf-8" })
      : new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  if (format === "json" && blob.size > MAX_BACKUP_BYTES)
    throw new Error("This backup is larger than the supported 5 MB limit. Nothing was changed.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `watch-crash-course-${format === "json" ? "backup" : "progress"}-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  // Allow the browser to begin the download before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return {
    backup,
    message:
      format === "json"
        ? "JSON backup download started."
        : catalog?.incomplete
          ? "CSV download started. Some course or episode names were unavailable; all saved progress is included."
          : "CSV download started.",
  };
}
