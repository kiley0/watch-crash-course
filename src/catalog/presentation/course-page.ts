import { bookSpread } from "./book-spread";
import { captureBookPage, animateBookTurn } from "./book-turn";
import { pageTitle } from "../../site/presentation/page-title";
import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./chapter-link.css";
import "./course.css";
import { chooseThoughtBubble } from "./thought-bubbles";
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
  let turnController: AbortController | undefined;
  let destroyed = false;
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
    get completionLabel(): string {
      return this.summary
        ? `${this.summary.completed} of ${this.summary.total} episodes completed`
        : "";
    },
    spread: 0,
    turn: "",
    get bookmarkStart(): number {
      return Math.max(
        0,
        this.episodes.findIndex((episode) => episode.videoId === this.currentEpisode.videoId),
      );
    },
    get pages() {
      return bookSpread(this.episodes.length, this.bookmarkStart, this.spread);
    },
    get leftEpisodes(): EpisodeLink[] {
      return this.episodes.slice(...this.pages.left);
    },
    get bookmarkEpisodes(): EpisodeLink[] {
      return this.episodes.slice(...this.pages.right);
    },
    get canTurnForward(): boolean {
      return this.pages.hasNext;
    },
    get rightPageLabel(): string {
      return this.bookmarkEpisodes
        .map((episode) => episode.displayNumber)
        .filter((_, index, episodes) => index === 0 || index === episodes.length - 1)
        .join("–");
    },
    get spreadLabel(): string {
      const visible = [...this.leftEpisodes, ...this.bookmarkEpisodes];
      const first = visible[0]?.number;
      const last = visible.at(-1)?.number;
      if (first === undefined) return "Opening your course…";
      const range = first === last ? String(first) : `${first}–${last}`;
      return `${this.pages.spread ? (first === last ? "Episode" : "Episodes") : "Contents and episodes"} ${range}`;
    },
    async turnSpread(direction: "forward" | "backward") {
      if (
        destroyed ||
        this.turn ||
        (direction === "forward" ? !this.canTurnForward : !this.pages.spread)
      )
        return;
      const forward = direction === "forward";
      const book = document.querySelector<HTMLElement>(".course-book");
      const animate =
        book &&
        typeof book.animate === "function" &&
        window.matchMedia("(min-width: 650px) and (prefers-reduced-motion: no-preference)").matches;
      const leftSelector = this.pages.spread ? ".course-chapter-left" : ".course-contents";
      const rightSelector = ".course-chapter:not(.course-chapter-left)";
      const front = animate ? captureBookPage(book, forward ? rightSelector : leftSelector) : null;
      const stationary = animate
        ? captureBookPage(book, forward ? leftSelector : rightSelector)
        : null;
      const controller = new AbortController();
      turnController = controller;
      this.turn = direction;
      try {
        this.spread = this.pages.spread + (forward ? 1 : -1);
        await Alpine.nextTick();
        if (controller.signal.aborted) return;
        const back = animate
          ? captureBookPage(book, forward ? ".course-chapter-left" : rightSelector)
          : null;
        if (book && front && back)
          await animateBookTurn(book, front, back, stationary, forward, controller.signal);
      } finally {
        this.turn = "";
        turnController = undefined;
      }
    },
    nextSpread() {
      return this.turnSpread("forward");
    },
    previousSpread() {
      return this.turnSpread("backward");
    },
    get currentEpisode(): EpisodeLink {
      return (
        this.episodes.find((episode) => episode.videoId === this.summary?.continueVideoId) ??
        this.episodes[0] ?? {
          number: 1,
          displayNumber: "01",
          title: "",
          videoId: "",
          sourceUrl: "",
          href: "",
          status: "Not started",
        }
      );
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
      destroyed = true;
      turnController?.abort();
      stopRefreshOnRestore();
    },
    async refreshProgress() {
      if (!this.ready) return;
      const previousBookmark = this.summary?.continueVideoId;
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
      if (previousBookmark !== this.summary.continueVideoId) {
        turnController?.abort();
        this.spread = 0;
      }
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
        this.spread = 0;
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
        document.title = pageTitle(course.title);
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
