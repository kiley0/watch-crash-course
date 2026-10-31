import { parseProgress } from "../../learning/domain/progress";
import type { VideoProgress } from "../../learning/domain/progress";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 10000;
export interface Backup {
  format: "watch-crash-course";
  version: 1;
  exportedAt: number;
  videos: VideoProgress[];
}
function fields(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid backup record.");
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).some((key) => !allowed.includes(key)) ||
    allowed.some((key) => !Object.hasOwn(data, key))
  )
    throw new Error("The backup contains missing or unsupported fields.");
  return data;
}
export function parseBackup(value: unknown): Backup {
  const data = fields(value, ["format", "version", "exportedAt", "videos"]);
  if (data.format !== "watch-crash-course" || data.version !== 1)
    throw new Error("This backup format or version is not supported.");
  if (
    typeof data.exportedAt !== "number" ||
    !Number.isSafeInteger(data.exportedAt) ||
    data.exportedAt < 0 ||
    data.exportedAt > 8640000000000000
  )
    throw new Error("Invalid backup date.");
  if (!Array.isArray(data.videos) || data.videos.length > MAX_BACKUP_RECORDS)
    throw new Error("The backup contains too many records or invalid lists.");
  const ids = new Set<string>();
  const videos = data.videos.map((item: unknown) => {
    const record = fields(item, [
      "schemaVersion",
      "videoId",
      "position",
      "duration",
      "lastWatchedAt",
      "completed",
      "completionSource",
    ]);
    if (typeof record.videoId !== "string" || ids.has(record.videoId))
      throw new Error("Duplicate or invalid video record.");
    ids.add(record.videoId);
    return parseProgress(record, record.videoId)!;
  });
  return { format: "watch-crash-course", version: 1, exportedAt: data.exportedAt, videos };
}
export function readBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("Choose a backup smaller than 5 MB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This file isn’t valid JSON. Choose a Watch Crash Course backup.");
  }
  return parseBackup(value);
}
