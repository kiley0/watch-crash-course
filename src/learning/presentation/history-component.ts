import { exportProgress } from "../../data/presentation/export-progress";
import { progressStore } from "../infrastructure/browser-progress";
import type { VideoProgress } from "../domain/progress";
import { learningTimeLabel } from "./learning-time-label";
import { historyEntries } from "./history-entries";
import type { HistoryEntry, HistoryMetadata } from "./history-entries";
import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import type { Course, Episode } from "../../catalog/domain/course";
import { collectionLabel } from "../../catalog/domain/course";
import { watchUrl } from "../../playback/presentation/watch-links";
import { refreshOnRestore } from "../../site/reload-on-restore";
interface CatalogCourse extends Course {
  episodes: (Episode & { href: string; displayNumber: string })[];
  unavailable: boolean;
}
function catalogProgress(watched: number, total: number, unavailable: boolean) {
  return {
    countLabel: `${unavailable ? "—" : watched} / ${total}`,
    progressLabel: unavailable
      ? `Watched count unavailable; ${total} episodes total`
      : `${watched} of ${total} episodes watched`,
  };
}
export function createHistoryPage() {
  let stopRefreshOnRestore = () => {};
  let records: VideoProgress[] = [];
  let known = new Map<string, HistoryMetadata>();
  return {
    exporting: false,
    exportMessage: "",
    async downloadHistory(format: "csv" | "json") {
      if (this.exporting || this.loading) return;
      this.exporting = true;
      this.exportMessage = "";
      try {
        this.exportMessage = (await exportProgress(format)).message;
      } catch (error) {
        this.exportMessage =
          error instanceof Error ? error.message : "Your progress couldn’t be downloaded.";
      } finally {
        this.exporting = false;
      }
    },
    entries: [] as HistoryEntry[],
    catalogCourses: [] as CatalogCourse[],
    get catalogCollections() {
      const activity = new Map(this.entries.map((entry) => [entry.videoId, entry]));
      return (["crash-course", "study-hall"] as const).map((id) => {
        const courses = this.catalogCourses
          .filter((course) => course.collection === id)
          .map((course) => {
            const watchedCount = course.episodes.filter((episode) =>
              activity.has(episode.videoId),
            ).length;
            return {
              ...course,
              watchedCount,
              ...catalogProgress(
                watchedCount,
                course.episodeCount,
                course.unavailable || Boolean(this.storageWarning),
              ),
              episodes: course.episodes.map((episode) => ({
                ...episode,
                watched: activity.has(episode.videoId),
                activityLabel: activity.get(episode.videoId)?.completed
                  ? "Completed"
                  : "Previously played",
              })),
            };
          });
        const watchedCount = courses.reduce((sum, course) => sum + course.watchedCount, 0);
        const episodeCount = courses.reduce((sum, course) => sum + course.episodeCount, 0);
        return {
          id,
          title: collectionLabel({ collection: id }),
          courses,
          topics: [...new Set(courses.map((course) => course.subject))].toSorted().map((title) => {
            const topicCourses = courses
              .filter((course) => course.subject === title)
              .toSorted((a, b) => a.title.localeCompare(b.title));
            const watchedCount = topicCourses.reduce((sum, course) => sum + course.watchedCount, 0);
            const episodeCount = topicCourses.reduce((sum, course) => sum + course.episodeCount, 0);
            return {
              title,
              courses: topicCourses,
              watchedCount,
              episodeCount,
              ...catalogProgress(
                watchedCount,
                episodeCount,
                topicCourses.some((course) => course.unavailable) || Boolean(this.storageWarning),
              ),
            };
          }),
          watchedCount,
          episodeCount,
          ...catalogProgress(
            watchedCount,
            episodeCount,
            courses.some((course) => course.unavailable) || Boolean(this.storageWarning),
          ),
        };
      });
    },
    get viewingSummary(): string {
      if (this.loading || this.metadataLoading) return "Calculating your viewing history…";
      if (this.storageWarning)
        return "Your full viewing summary is unavailable because saved progress couldn’t be read reliably.";
      if (!this.catalogCourses.length || this.catalogCourses.some((course) => course.unavailable))
        return "Your viewing summary is unavailable while course details are missing. Try loading them again.";
      const watched = new Set(this.entries.map((entry) => entry.videoId));
      const catalogVideos = new Set(
        this.catalogCourses.flatMap((course) => course.episodes.map((episode) => episode.videoId)),
      );
      const count = [...catalogVideos].filter((id) => watched.has(id)).length;
      const courses = this.catalogCourses.filter((course) =>
        course.episodes.some((episode) => watched.has(episode.videoId)),
      ).length;
      const percent = catalogVideos.size ? (count / catalogVideos.size) * 100 : 0;
      const percentage = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
        percent,
      );
      const seconds = this.entries
        .filter((entry) => catalogVideos.has(entry.videoId))
        .reduce((sum, entry) => sum + entry.position, 0);
      return `You have watched ${count} ${count === 1 ? "episode" : "episodes"} across ${courses} ${courses === 1 ? "course" : "courses"} for a total of ${learningTimeLabel(seconds)} of learning time. That's ${percent > 0 && percent < 0.1 ? "<0.1" : percentage}% of all episodes.`;
    },
    get catalogResultLabel(): string {
      return `${this.catalogCourses.length} courses · 2 collections`;
    },
    loading: true,
    storageWarning: "",
    catalogWarning: "",
    metadataLoading: false,
    get hasEntries(): boolean {
      return !this.loading && this.entries.length > 0;
    },
    get emptyHeading(): string {
      return this.storageWarning
        ? "Your history couldn’t be opened."
        : "A good place for a beginning.";
    },
    get emptyMessage(): string {
      return this.storageWarning
        ? "You can still explore the courses. Your existing saved data hasn’t been cleared."
        : "No viewing history in this browser yet. Choose a lesson and we’ll save you a place.";
    },
    get empty(): boolean {
      return !this.loading && this.entries.length === 0;
    },
    async init() {
      stopRefreshOnRestore = refreshOnRestore(() => this.refreshProgress());
      records = await progressStore.list();
      this.storageWarning = progressStore.warning;
      this.entries = historyEntries(records);
      this.loading = false;
      await this.loadMetadata();
    },
    destroy() {
      stopRefreshOnRestore();
    },
    async refreshProgress() {
      records = await progressStore.refresh();
      this.storageWarning = progressStore.warning;
      this.entries = historyEntries(records, known);
      if (
        (!this.catalogCourses.length || this.catalogCourses.some((course) => course.unavailable)) &&
        !this.metadataLoading
      )
        await this.loadMetadata();
    },
    async loadMetadata() {
      if (this.metadataLoading) return;
      this.metadataLoading = true;
      this.catalogWarning = "";
      try {
        const courses = await loadCatalog();
        const cached = new Map(
          this.catalogCourses
            .filter((course) => !course.unavailable)
            .map((course) => [course.id, course]),
        );
        const details = await Promise.allSettled(
          courses.map(async (course) => {
            const previous = cached.get(course.id);
            const detail =
              previous && previous.episodeCount === course.episodeCount
                ? { courseId: course.id, episodes: previous.episodes }
                : await loadDetail(course);
            return { course, detail };
          }),
        );
        this.catalogCourses = courses.map((course, index) => {
          const result = details[index]!;
          return {
            ...course,
            unavailable: result.status === "rejected",
            episodes:
              result.status === "fulfilled"
                ? result.value.detail.episodes.map((episode) => ({
                    ...episode,
                    href: watchUrl(course.id, episode.videoId),
                    displayNumber: String(episode.number).padStart(2, "0"),
                  }))
                : [],
          };
        });
        known = new Map<string, HistoryMetadata>();
        for (const result of details) {
          if (result.status !== "fulfilled") continue;
          const { course, detail } = result.value;
          for (const episode of detail.episodes) {
            if (!known.has(episode.videoId))
              known.set(episode.videoId, {
                title: episode.title,
                context: `${collectionLabel(course)} · ${course.title}`,
                href: watchUrl(course.id, episode.videoId),
              });
          }
        }
        this.entries = historyEntries(records, known);
        if (details.some((result) => result.status === "rejected"))
          this.catalogWarning =
            "Some course details couldn’t load. Your saved history is still available.";
      } catch {
        this.entries = historyEntries(records, known);
        this.catalogWarning =
          "The catalog couldn’t load. Your saved history is still available. Try loading course details again.";
      } finally {
        this.metadataLoading = false;
      }
    },
  };
}
