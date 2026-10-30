import type { VideoProgress } from "../domain/progress";
import { progressStatus } from "../domain/progress";
import { viewingHistory } from "../domain/course-summary";
import { timeLabel } from "./progress-labels";
import { videoUrl } from "../../playback/presentation/youtube-links";
export interface HistoryMetadata {
  title: string;
  context: string;
  href: string;
}
export interface HistoryEntry extends VideoProgress, HistoryMetadata {
  linkLabel: string;
  dateLabel: string;
  isoDate: string;
  status: string;
  positionLabel: string;
}
// Rebuild from saved records on every metadata attempt, rather than enriching stale UI rows.
export function historyEntries(
  records: readonly VideoProgress[],
  metadata: ReadonlyMap<string, HistoryMetadata> = new Map(),
): HistoryEntry[] {
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return viewingHistory(records).map((record) => {
    const known = metadata.get(record.videoId);
    return {
      ...record,
      title: known?.title ?? `Saved video · ${record.videoId}`,
      context: known?.context ?? "Course details unavailable · your saved record is still here.",
      href: known?.href ?? videoUrl(record.videoId),
      linkLabel: known
        ? record.completed
          ? "Watch again"
          : "Continue watching"
        : "Open on YouTube",
      dateLabel: dateFormat.format(record.lastWatchedAt),
      isoDate: new Date(record.lastWatchedAt).toISOString(),
      status: progressStatus(record),
      positionLabel: `Saved position ${timeLabel(record.position)}`,
    };
  });
}
