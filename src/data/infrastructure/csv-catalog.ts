import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import { collectionLabel } from "../../catalog/domain/course";
import type { CsvEpisode } from "../domain/progress-csv";

export async function csvCatalog(videoIds: readonly string[]) {
  const episodes = new Map<string, CsvEpisode>();
  if (!videoIds.length) return { episodes, incomplete: false };
  const wanted = new Set(videoIds);
  try {
    const courses = await loadCatalog();
    const details = await Promise.allSettled(courses.map((course) => loadDetail(course)));
    for (const [index, result] of details.entries()) {
      if (result.status !== "fulfilled") continue;
      const course = courses[index]!;
      for (const episode of result.value.episodes) {
        if (wanted.has(episode.videoId) && !episodes.has(episode.videoId))
          episodes.set(episode.videoId, {
            collection: collectionLabel(course),
            course: course.title,
            number: episode.number,
            title: episode.title,
          });
      }
    }
  } catch {
    // Catalog availability must not prevent downloading the user's saved progress.
  }
  return { episodes, incomplete: videoIds.some((id) => !episodes.has(id)) };
}
