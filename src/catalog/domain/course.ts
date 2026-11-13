export interface PlaylistPart {
  title: string;
  playlistId: string;
  startEpisode: number;
}
export type Collection = "crash-course" | "study-hall";
export interface Course {
  collection: Collection;
  series?: "College Foundations" | "Original series";
  id: string;
  title: string;
  subject: string;
  host: string;
  episodeCount: number;
  description: string;
  playlistId: string;
  playlistParts?: PlaylistPart[];
  sourceUrl: string;
  reviewedAt: string;
}
export interface Episode {
  description?: string;
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
function studyHallSource(value: unknown, playlistId: string): string {
  const expected = `https://www.youtube.com/playlist?list=${playlistId}`;
  if (value !== expected) throw new Error("Invalid Study Hall source link.");
  return expected;
}
function episodeSource(value: unknown, videoId: string, collection: Collection): string {
  // Study Hall uses canonical video URLs; some Crash Course uploads also lack episode pages.
  // Accept only the canonical YouTube link for this exact, curated video.
  if (value === `https://www.youtube.com/watch?v=${videoId}`) return value;
  if (collection === "study-hall") throw new Error("Invalid Study Hall episode source.");
  return source(value);
}
export function parseCatalog(value: unknown): Course[] {
  if (!Array.isArray(value) || !value.length) throw new Error("The catalog is empty or invalid.");
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    const data = record(item);
    const id = string(data.id);
    if (!isCourseId(id) || ids.has(id)) throw new Error("Invalid or duplicate course ID.");
    ids.add(id);
    const collection = data.collection;
    if (collection !== "crash-course" && collection !== "study-hall")
      throw new Error("Invalid course collection.");
    const series = data.series;
    if (
      collection === "study-hall" &&
      series !== "College Foundations" &&
      series !== "Original series"
    )
      throw new Error("Invalid Study Hall series.");
    if (collection === "crash-course" && series !== undefined)
      throw new Error("Invalid course series.");
    const episodeCount = data.episodeCount;
    if (typeof episodeCount !== "number" || !Number.isSafeInteger(episodeCount) || episodeCount < 1)
      throw new Error("Invalid episode count.");
    const playlistId = string(data.playlistId);
    if (!/^[A-Za-z0-9_-]+$/.test(playlistId)) throw new Error("Invalid playlist ID.");
    let playlistParts: PlaylistPart[] | undefined;
    if (data.playlistParts !== undefined) {
      if (!Array.isArray(data.playlistParts) || !data.playlistParts.length)
        throw new Error("Invalid playlist parts.");
      let previous = 0;
      const playlists = new Set<string>();
      playlistParts = data.playlistParts.map((value: unknown, index: number) => {
        const part = record(value);
        const partId = string(part.playlistId);
        const start = part.startEpisode;
        if (
          !/^[A-Za-z0-9_-]+$/.test(partId) ||
          playlists.has(partId) ||
          typeof start !== "number" ||
          !Number.isSafeInteger(start) ||
          start <= previous ||
          start > episodeCount ||
          (index === 0 && (start !== 1 || partId !== playlistId))
        )
          throw new Error("Invalid playlist boundaries.");
        previous = start;
        playlists.add(partId);
        return { title: string(part.title), playlistId: partId, startEpisode: start };
      });
    }
    const reviewedAt = string(data.reviewedAt);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) ||
      !Number.isFinite(Date.parse(reviewedAt)) ||
      new Date(reviewedAt).toISOString().slice(0, 10) !== reviewedAt
    )
      throw new Error("Invalid review date.");
    return {
      id,
      collection,
      ...(collection === "study-hall"
        ? { series: series as "College Foundations" | "Original series" }
        : {}),
      title: string(data.title),
      subject: string(data.subject),
      host: string(data.host),
      description: string(data.description),
      episodeCount,
      playlistId,
      ...(playlistParts ? { playlistParts } : {}),
      sourceUrl:
        collection === "study-hall"
          ? studyHallSource(data.sourceUrl, playlistId)
          : source(data.sourceUrl),
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
      ...(episode.description === undefined ? {} : { description: string(episode.description) }),
      videoId,
      sourceUrl: episodeSource(episode.sourceUrl, videoId, course.collection),
    };
  });
  return { courseId: course.id, episodes };
}

export function playlistForEpisode(course: Course, episode: Episode): string {
  return (
    course.playlistParts?.findLast((part) => part.startEpisode <= episode.number)?.playlistId ??
    course.playlistId
  );
}

export function coursesInCollection(courses: readonly Course[], collection: Collection): Course[] {
  return courses.filter((course) => course.collection === collection);
}
export function collectionLabel(course: Pick<Course, "collection">): string {
  return course.collection === "study-hall" ? "Study Hall" : "Crash Course";
}
export function libraryUrl(course: Pick<Course, "collection">): string {
  return course.collection === "study-hall" ? "./study-hall.html#courses" : "./index.html#courses";
}
