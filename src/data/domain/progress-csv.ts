import type { Backup } from "./backup";
import { progressStatus } from "../../learning/domain/progress";

export interface CsvEpisode {
  collection: string;
  course: string;
  number: number;
  title: string;
}
// Quoting preserves commas/newlines; the apostrophe keeps spreadsheet text from becoming a formula.
function csvCell(value: string | number | boolean): string {
  let text = String(value);
  if (/^[\t\r\n]|^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function progressCsv(
  backup: Backup,
  episodes: ReadonlyMap<string, CsvEpisode> = new Map(),
): string {
  const rows: (string | number | boolean)[][] = [
    [
      "collection",
      "course",
      "episode_number",
      "episode_title",
      "video_id",
      "youtube_url",
      "status",
      "position_seconds",
      "duration_seconds",
      "progress_percent",
      "completed",
      "completion_source",
      "last_activity_utc",
    ],
  ];
  for (const record of backup.videos) {
    const episode = episodes.get(record.videoId);
    rows.push([
      episode?.collection ?? "",
      episode?.course ?? "",
      episode?.number ?? "",
      episode?.title ?? "",
      record.videoId,
      `https://www.youtube.com/watch?v=${record.videoId}`,
      progressStatus(record),
      record.position,
      record.duration,
      record.completed
        ? 100
        : record.duration
          ? Math.round((record.position / record.duration) * 1000) / 10
          : "",
      record.completed,
      record.completionSource ?? "",
      new Date(record.lastWatchedAt).toISOString(),
    ]);
  }
  // UTF-8 BOM helps spreadsheet applications recognize international course/episode titles.
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
