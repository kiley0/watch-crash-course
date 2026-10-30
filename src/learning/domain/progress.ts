export interface VideoProgress {
  schemaVersion: 1;
  videoId: string;
  position: number;
  duration: number;
  lastWatchedAt: number;
  completed: boolean;
  completionSource: "manual" | "ended" | null;
}
export type ProgressEvent =
  | { type: "playback"; position: number; duration: number; ended?: boolean }
  | { type: "complete" }
  | { type: "reset" };

function nonnegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
export function updateProgress(
  previous: VideoProgress | null,
  videoId: string,
  event: ProgressEvent,
  now: number,
): VideoProgress {
  const result: VideoProgress = {
    schemaVersion: 1,
    videoId,
    position: previous?.position ?? 0,
    duration: previous?.duration ?? 0,
    lastWatchedAt: now,
    completed: previous?.completed ?? false,
    completionSource: previous?.completionSource ?? null,
  };
  if (event.type === "reset") {
    result.position = 0;
    result.completed = false;
    result.completionSource = null;
  } else if (event.type === "complete") {
    result.completed = true;
    result.completionSource = "manual";
  } else {
    result.duration = nonnegative(event.duration) || result.duration;
    result.position = nonnegative(event.position);
    if (result.duration > 0) result.position = Math.min(result.position, result.duration);
    if (event.ended && !result.completed) {
      result.completed = true;
      result.completionSource = "ended";
    }
  }
  return result;
}

// Stored data is a versioned external format, even though we wrote it ourselves.
export function parseProgress(value: unknown, videoId: string): VideoProgress | null {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new Error("Invalid saved progress.");
  const data = value as Record<string, unknown>;
  if (
    data.schemaVersion !== 1 ||
    data.videoId !== videoId ||
    !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
    typeof data.position !== "number" ||
    !Number.isFinite(data.position) ||
    data.position < 0 ||
    typeof data.duration !== "number" ||
    !Number.isFinite(data.duration) ||
    data.duration < 0 ||
    (data.duration > 0 && data.position > data.duration) ||
    typeof data.lastWatchedAt !== "number" ||
    !Number.isFinite(data.lastWatchedAt) ||
    data.lastWatchedAt < 0 ||
    data.lastWatchedAt > 8640000000000000 ||
    typeof data.completed !== "boolean" ||
    (data.completed
      ? data.completionSource !== "manual" && data.completionSource !== "ended"
      : data.completionSource !== null)
  )
    throw new Error("Unsupported or invalid saved progress.");
  return {
    schemaVersion: 1,
    videoId,
    position: data.position,
    duration: data.duration,
    lastWatchedAt: data.lastWatchedAt,
    completed: data.completed,
    completionSource: data.completionSource as VideoProgress["completionSource"],
  };
}
export function resumePosition(progress: VideoProgress | null): number {
  if (!progress || progress.completed) return 0;
  if (progress.duration > 0 && progress.position >= progress.duration - 5) return 0;
  return Math.floor(progress.position);
}
export function progressStatus(progress: VideoProgress | null): string {
  if (progress?.completed) return "Completed";
  return progress && progress.position > 0 ? "In progress" : "Not started";
}
