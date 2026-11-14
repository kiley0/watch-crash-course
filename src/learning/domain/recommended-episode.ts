import { viewingHistory } from "./course-summary";
import { resumePosition } from "./progress";
import type { VideoProgress } from "./progress";

// Follow the latest activity in this course, rather than an older abandoned episode.
export function recommendedEpisode(
  episodeIds: readonly string[],
  records: readonly VideoProgress[],
): string | null {
  const members = new Set(episodeIds);
  const latest = viewingHistory(records).find((record) => members.has(record.videoId));
  if (latest && !latest.completed && resumePosition(latest) > 0) return latest.videoId;
  const completed = new Set(
    records.filter((record) => record.completed).map((record) => record.videoId),
  );
  const start = latest ? episodeIds.indexOf(latest.videoId) + 1 : 0;
  return (
    episodeIds.slice(start).find((id) => !completed.has(id)) ??
    episodeIds.find((id) => !completed.has(id)) ??
    null
  );
}
