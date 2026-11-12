import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./course.css";
import { chooseThoughtBubble } from "./thought-bubbles";
import { progressPizza } from "./progress-pizza";
import { loadCatalog, loadDetail } from "../infrastructure/static-catalog";
import { isCourseId, collectionLabel, libraryUrl } from "../domain/course";
import { matchesQuery } from "../domain/search";
import { watchUrl } from "../../playback/presentation/watch-links";
import { completeCourse } from "../../learning/application/complete-course";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import { summarizeCourse } from "../../learning/domain/course-summary";
import type { CourseSummary } from "../../learning/domain/course-summary";
import { progressStatus } from "../../learning/domain/progress";
import { refreshOnRestore } from "../../site/reload-on-restore";
import type { Course, Episode } from "../domain/course";
interface EpisodeLink extends Episode {
  href: string;
  displayNumber: string;
  status: string;
}
Alpine.data("coursePage", () => {
  let stopRefreshOnRestore = () => {};
  return {
    thought: chooseThoughtBubble(),
    get thoughtUrl(): string {
      return watchUrl(this.thought.courseId, this.thought.videoId);
    },
    course: {} as Course,
    get collectionName(): string {
      return collectionLabel(this.course);
    },
    get libraryHref(): string {
      return libraryUrl(this.course);
    },
    get libraryBackLabel(): string {
      return `Back to ${this.collectionName} courses`;
    },
    get sourceLinkLabel(): string {
      return this.course.collection === "study-hall"
        ? "Study Hall course playlist"
        : "Course on Crash Course";
    },
    get fanDisclosure(): string {
      return this.course.collection === "study-hall"
        ? "An unofficial, fan-made course guide. Not affiliated with or endorsed by Study Hall, ASU, or Crash Course."
        : "An unofficial, fan-made course guide. Not affiliated with or endorsed by Crash Course.";
    },
    episodes: [] as EpisodeLink[],
    query: "",
    loading: true,
    error: "",
    canRetry: false,
    storageWarning: "",
    markingComplete: false,
    completionMessage: "",
    get markCompleteLabel(): string {
      return this.markingComplete ? "Marking complete…" : "Mark course complete";
    },
    async markCourseComplete() {
      if (this.markingComplete || this.courseComplete || !this.ready) return;
      this.markingComplete = true;
      this.completionMessage = "";
      try {
        const records = await completeCourse(
          this.episodes.map((episode) => episode.videoId),
          progressStore,
        );
        this.episodes = this.episodes.map((episode, index) => ({
          ...episode,
          status: progressStatus(records[index] ?? null),
        }));
        this.summary = summarizeCourse(
          this.episodes.map((episode) => episode.videoId),
          records,
        );
        this.storageWarning = progressStore.warning;
        this.completionMessage = this.storageWarning
          ? "Course marked complete in this tab."
          : "Course marked complete.";
      } catch {
        this.completionMessage =
          "We couldn’t finish marking the course complete. Please try again.";
      } finally {
        this.markingComplete = false;
      }
      await Alpine.nextTick(() => document.getElementById("course-completion-message")?.focus());
    },
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
      return id ? watchUrl(this.course.id, id) : libraryUrl(this.course);
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
    get pizza() {
      return progressPizza(this.episodes.map((episode) => episode.status === "Completed"));
    },
    get completionPercent(): number {
      return this.summary?.percent ?? 0;
    },
    get courseComplete(): boolean {
      return this.summary?.isComplete ?? false;
    },
    get playlists() {
      const parts = this.course.playlistParts ?? [
        { title: "Official YouTube playlist", playlistId: this.course.playlistId },
      ];
      return parts.map((part) => ({
        title: part.title,
        url: `https://www.youtube.com/playlist?list=${encodeURIComponent(part.playlistId ?? "")}`,
      }));
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
      stopRefreshOnRestore = refreshOnRestore(() => this.refreshProgress());
      await this.load();
    },
    destroy() {
      stopRefreshOnRestore();
    },
    async refreshProgress() {
      if (!this.ready) return;
      const records = await progressStore.refresh();
      const byId = new Map(records.map((record) => [record.videoId, record]));
      this.episodes = this.episodes.map((episode) => ({
        ...episode,
        status: progressStatus(byId.get(episode.videoId) ?? null),
      }));
      this.summary = summarizeCourse(
        this.episodes.map((episode) => episode.videoId),
        records,
      );
      this.storageWarning = progressStore.warning;
      this.completionMessage = "";
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
