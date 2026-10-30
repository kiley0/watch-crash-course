import type { VideoProgress } from "./progress";

export interface CourseSummary {
  total: number;
  completed: number;
  percent: number;
  lastActivityAt: number;
  continueVideoId: string | null;
  isComplete: boolean;
}
// One latest record per video, rather than an unbounded viewing-event log.
export function viewingHistory(records: readonly VideoProgress[]): VideoProgress[] {
  return records
    .filter((record) => record.completed || record.position > 0)
    .toSorted((a, b) => b.lastWatchedAt - a.lastWatchedAt || a.videoId.localeCompare(b.videoId));
}
export function mostRecentUnfinished(
  records: readonly VideoProgress[],
  episodeIds: readonly string[],
): string | null {
  const available = new Set(episodeIds);
  return (
    viewingHistory(records).find((record) => !record.completed && available.has(record.videoId))
      ?.videoId ?? null
  );
}
export function summarizeCourse(
  episodeIds: readonly string[],
  records: readonly VideoProgress[],
): CourseSummary {
  const ids = [...new Set(episodeIds)];
  const progress = new Map(records.map((record) => [record.videoId, record]));
  const members = new Set(ids);
  const activity = viewingHistory(records).filter((record) => members.has(record.videoId));
  const completed = ids.filter((id) => progress.get(id)?.completed).length;
  const isComplete = ids.length > 0 && completed === ids.length;
  const unfinished = activity.find((record) => !record.completed);
  return {
    total: ids.length,
    completed,
    percent: ids.length ? Math.round((completed / ids.length) * 100) : 0,
    lastActivityAt: activity[0]?.lastWatchedAt ?? 0,
    continueVideoId:
      unfinished?.videoId ?? ids.find((id) => !progress.get(id)?.completed) ?? ids[0] ?? null,
    isComplete,
  };
}
