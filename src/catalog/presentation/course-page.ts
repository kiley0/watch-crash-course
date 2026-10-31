import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import { loadCatalog, loadDetail } from "../infrastructure/static-catalog";
import { isCourseId } from "../domain/course";
import { matchesQuery } from "../domain/search";
import { watchUrl } from "../../playback/presentation/watch-links";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import { summarizeCourse } from "../../learning/domain/course-summary";
import type { CourseSummary } from "../../learning/domain/course-summary";
import { progressStatus } from "../../learning/domain/progress";
import { reloadOnRestore } from "../../site/reload-on-restore";
import type { Course, Episode } from "../domain/course";
interface EpisodeLink extends Episode {
  href: string;
  displayNumber: string;
  status: string;
}
Alpine.data("coursePage", () => {
  let stopReloadOnRestore = () => {};
  return {
    course: {} as Course,
    episodes: [] as EpisodeLink[],
    query: "",
    loading: true,
    error: "",
    canRetry: false,
    storageWarning: "",
    summary: null as CourseSummary | null,
    get ready(): boolean {
      return !this.loading && !this.error;
    },
    get episodeLabel(): string {
      return `${this.episodes.length} episodes`;
    },
    get reviewLabel(): string {
      if (!this.course.reviewedAt) return "";
      return `Catalog reviewed ${new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(this.course.reviewedAt))}`;
    },
    get sourceDescription(): string {
      return `All ${this.course.episodeCount} numbered episodes, in order. Previews and extras aren’t counted as lessons.`;
    },
    get continueUrl(): string {
      const id = this.summary?.continueVideoId;
      return id ? watchUrl(this.course.id, id) : "./index.html#courses";
    },
    get continueLabel(): string {
      if (this.summary?.isComplete) return "Watch the course again";
      return this.summary?.lastActivityAt ? "Continue learning" : "Start with episode 1";
    },
    get completionLabel(): string {
      return this.summary
        ? `${this.summary.completed} of ${this.summary.total} episodes completed`
        : "";
    },
    get completionPercent(): number {
      return this.summary?.percent ?? 0;
    },
    get courseComplete(): boolean {
      return this.summary?.isComplete ?? false;
    },
    get playlistUrl(): string {
      return `https://www.youtube.com/playlist?list=${encodeURIComponent(this.course.playlistId ?? "")}`;
    },
    get filteredEpisodes(): EpisodeLink[] {
      return this.episodes.filter((episode) =>
        matchesQuery(this.query, episode.title, String(episode.number)),
      );
    },
    get empty(): boolean {
      return this.filteredEpisodes.length === 0;
    },
    get showReviewNote(): boolean {
      return !this.query.trim();
    },
    get resultLabel(): string {
      return `${this.filteredEpisodes.length} of ${this.episodes.length} episodes`;
    },
    clearSearch() {
      this.query = "";
    },
    async init() {
      stopReloadOnRestore = reloadOnRestore();
      await this.load();
    },
    destroy() {
      stopReloadOnRestore();
    },
    async load() {
      this.loading = true;
      this.error = "";
      this.canRetry = false;
      try {
        const id = new URLSearchParams(window.location.search).get("id");
        if (!id || !isCourseId(id)) {
          this.error =
            "That course link doesn’t look right. Head back to the shelf to pick a course.";
          return;
        }
        const course = (await loadCatalog()).find((item) => item.id === id);
        if (!course) {
          this.error =
            "We couldn’t find that course on the shelf. Explore the catalog to find something new.";
          return;
        }
        const detail = await loadDetail(course);
        this.course = course;
        const records = await Promise.all(
          detail.episodes.map((episode) => progressStore.load(episode.videoId)),
        );
        this.summary = summarizeCourse(
          detail.episodes.map((episode) => episode.videoId),
          records.filter((record) => record !== null),
        );
        this.episodes = detail.episodes.map((episode, index) => ({
          ...episode,
          displayNumber: String(episode.number).padStart(2, "0"),
          href: watchUrl(course.id, episode.videoId),
          status: progressStatus(records[index] ?? null),
        }));
        this.storageWarning = progressStore.warning;
        document.title = `${course.title} · Watch Crash Course`;
      } catch {
        this.canRetry = true;
        this.error = "We couldn’t load this course. Check your connection and try again.";
      } finally {
        this.loading = false;
      }
    },
  };
});
Alpine.start();
