export interface Course {
  id: string;
  title: string;
  subject: string;
  host: string;
  episodeCount: number;
  description: string;
  playlistId: string;
  sourceUrl: string;
  reviewedAt: string;
}
export interface Episode {
  number: number;
  title: string;
  videoId: string;
  sourceUrl: string;
}
export interface CourseDetail {
  courseId: string;
  episodes: Episode[];
}
export function isCourseId(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid catalog record.");
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Missing catalog text.");
  return value;
}
function source(value: unknown): string {
  const url = new URL(string(value));
  if (url.origin !== "https://thecrashcourse.com" || url.username || url.password)
    throw new Error("Invalid source link.");
  return url.href;
}
export function parseCatalog(value: unknown): Course[] {
  if (!Array.isArray(value) || !value.length) throw new Error("The catalog is empty or invalid.");
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    const data = record(item);
    const id = string(data.id);
    if (!isCourseId(id) || ids.has(id)) throw new Error("Invalid or duplicate course ID.");
    ids.add(id);
    const episodeCount = data.episodeCount;
    if (typeof episodeCount !== "number" || !Number.isSafeInteger(episodeCount) || episodeCount < 1)
      throw new Error("Invalid episode count.");
    const playlistId = string(data.playlistId);
    if (!/^[A-Za-z0-9_-]+$/.test(playlistId)) throw new Error("Invalid playlist ID.");
    const reviewedAt = string(data.reviewedAt);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) ||
      !Number.isFinite(Date.parse(reviewedAt)) ||
      new Date(reviewedAt).toISOString().slice(0, 10) !== reviewedAt
    )
      throw new Error("Invalid review date.");
    return {
      id,
      title: string(data.title),
      subject: string(data.subject),
      host: string(data.host),
      description: string(data.description),
      episodeCount,
      playlistId,
      sourceUrl: source(data.sourceUrl),
      reviewedAt,
    };
  });
}
export function parseDetail(value: unknown, course: Course): CourseDetail {
  const data = record(value);
  if (
    data.courseId !== course.id ||
    !Array.isArray(data.episodes) ||
    data.episodes.length !== course.episodeCount
  )
    throw new Error("Course episodes do not match the catalog.");
  const videoIds = new Set<string>();
  const episodes = data.episodes.map((item: unknown, index: number) => {
    const episode = record(item);
    const videoId = string(episode.videoId);
    if (
      !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
      videoIds.has(videoId) ||
      episode.number !== index + 1
    )
      throw new Error("Invalid episode order or video ID.");
    videoIds.add(videoId);
    return {
      number: index + 1,
      title: string(episode.title),
      videoId,
      sourceUrl: source(episode.sourceUrl),
    };
  });
  return { courseId: course.id, episodes };
}
