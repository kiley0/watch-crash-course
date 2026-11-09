import { trackVideoPlay } from "../../site/infrastructure/analytics";
import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./watch.css";
import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import {
  isCourseId,
  playlistForEpisode,
  collectionLabel,
  libraryUrl,
} from "../../catalog/domain/course";
import type { Course, Episode } from "../../catalog/domain/course";
import { videoUrl } from "./youtube-links";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import { progressStatus, resumePosition } from "../../learning/domain/progress";
import type { ProgressEvent, VideoProgress } from "../../learning/domain/progress";
import { timeLabel } from "../../learning/presentation/progress-labels";
import { createYouTubePlayer } from "../infrastructure/youtube-player";
import type { PlayerSession } from "../infrastructure/youtube-player";
import { reloadOnRestore } from "../../site/reload-on-restore";
import { watchUrl } from "./watch-links";

Alpine.data("watchPage", () => {
  let session: PlayerSession | undefined;
  let disposed = false;
  let playCounted = false;
  const visibility = () => {
    if (document.hidden) session?.save();
  };
  const pageHide = () => session?.destroy();
  let stopReloadOnRestore = () => {};
  function focusAfterUpdate(id: string) {
    // x-show reveals new controls on its next frame; focus after that reveal.
    void Alpine.nextTick(() =>
      requestAnimationFrame(() => {
        if (!disposed) document.getElementById(id)?.focus();
      }),
    );
  }
  return {
    course: {} as Course,
    get libraryHref(): string {
      return libraryUrl(this.course);
    },
    get collectionName(): string {
      return collectionLabel(this.course);
    },
    episode: {} as Episode,
    previousUrl: "",
    nextUrl: "",
    nextTitle: "",
    canRetry: false,
    progress: null as VideoProgress | null,
    loading: true,
    error: "",
    storageWarning: "",
    playerStarted: false,
    playerError: "",
    playerStatus: "",
    resetPending: false,
    get ready(): boolean {
      return !this.loading && !this.error;
    },
    get courseUrl(): string {
      return this.course.id
        ? `./course.html?id=${encodeURIComponent(this.course.id)}`
        : "./index.html#courses";
    },
    get courseBackLabel(): string {
      return this.course.title ? `Back to ${this.course.title}` : "Back to the course shelf";
    },
    get hasProgress(): boolean {
      return !!this.progress && (this.progress.completed || this.progress.position > 0);
    },
    get canMarkComplete(): boolean {
      return !this.isCompleted;
    },
    get nextLabel(): string {
      return `Next: ${this.nextTitle}`;
    },
    get episodeContextLabel(): string {
      return this.episode.number
        ? `${this.collectionName} · ${this.course.title} · EPISODE ${this.episode.number} OF ${this.course.episodeCount}`
        : "";
    },
    get showNextLink(): boolean {
      return this.hasNext && !this.isCompleted;
    },
    get completionMessage(): string {
      return this.hasNext
        ? "Ready for another good idea? Your next lesson is waiting."
        : "That’s the last episode in this course. You can revisit any lesson from the course page.";
    },
    get youtubeUrl(): string {
      return this.episode.videoId
        ? videoUrl(this.episode.videoId, playlistForEpisode(this.course, this.episode))
        : "https://www.youtube.com/user/crashcourse";
    },
    get statusLabel(): string {
      return progressStatus(this.progress);
    },
    get isCompleted(): boolean {
      return this.progress?.completed ?? false;
    },
    get hasPrevious(): boolean {
      return !!this.previousUrl;
    },
    get isLastEpisode(): boolean {
      return !this.hasNext;
    },
    get hasNext(): boolean {
      return !!this.nextUrl;
    },
    get canResume(): boolean {
      return resumePosition(this.progress) > 0;
    },
    get savedLabel(): string {
      if (this.storageWarning) return "Progress is temporary in this tab.";
      if (!this.hasProgress) return "Your place will be saved as you watch.";
      return this.isCompleted
        ? "Saved in this browser."
        : `Your place: ${timeLabel(this.progress?.position ?? 0)} · saved in this browser.`;
    },
    get canRetryPlayer(): boolean {
      return !!this.playerError;
    },
    async init() {
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pagehide", pageHide);
      stopReloadOnRestore = reloadOnRestore();
      await this.load();
    },
    destroy() {
      disposed = true;
      session?.destroy();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide);
      stopReloadOnRestore();
    },
    async load() {
      this.loading = true;
      this.error = "";
      this.canRetry = false;
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("course");
        const videoId = params.get("video");
        if (!id || !isCourseId(id) || !videoId) {
          this.error =
            "This lesson link doesn’t look right. Choose an episode from the course shelf.";
          return;
        }
        const course = (await loadCatalog()).find((item) => item.id === id);
        if (!course) {
          this.error =
            "This course isn’t on the shelf. Explore the available courses to find a lesson.";
          return;
        }
        const detail = await loadDetail(course);
        const index = detail.episodes.findIndex((episode) => episode.videoId === videoId);
        const episode = detail.episodes[index];
        if (!episode) {
          this.course = course;
          this.error =
            "This episode isn’t in that course. Head back to the course to choose a lesson.";
          return;
        }
        this.course = course;
        this.episode = episode;
        const previous = detail.episodes[index - 1];
        const next = detail.episodes[index + 1];
        this.previousUrl = previous ? watchUrl(course.id, previous.videoId) : "";
        this.nextUrl = next ? watchUrl(course.id, next.videoId) : "";
        this.nextTitle = next?.title ?? "";
        this.progress = await progressStore.load(videoId);
        this.storageWarning = progressStore.warning;
        document.title = `${episode.title} · ${course.title} · Watch Crash Course`;
      } catch {
        this.canRetry = true;
        this.error =
          "We couldn’t load this lesson. Check your connection and try again, or choose another episode.";
      } finally {
        this.loading = false;
      }
      await Alpine.nextTick();
      if (this.ready && !disposed) await this.resume();
    },
    async record(event: ProgressEvent) {
      this.progress = await progressStore.update(this.episode.videoId, event);
      this.storageWarning = progressStore.warning;
    },
    async startPlayer(seconds: number) {
      session?.destroy();
      this.playerStarted = true;
      this.playerError = "";
      this.playerStatus = "Opening YouTube…";
      const container = document.querySelector<HTMLElement>("#player-container");
      if (!container) return;
      const currentSession = createYouTubePlayer(
        container,
        this.episode.videoId,
        (sample) => {
          void this.record({ type: "playback", ...sample });
        },
        (message) => {
          if (!disposed) this.playerStatus = message;
        },
        (message) => {
          if (!disposed) {
            this.playerError = message;
            this.playerStatus = "";
          }
        },
        () => {
          if (!disposed && !playCounted) {
            playCounted = true;
            trackVideoPlay(this.course.id, this.episode.videoId);
          }
        },
      );
      session = currentSession;
      try {
        await currentSession.start(seconds);
      } catch {
        if (disposed || session !== currentSession) return;
        this.playerError = "YouTube couldn’t load. Try again or open the original video below.";
        this.playerStatus = "";
      }
    },
    async resume() {
      await this.startPlayer(resumePosition(this.progress));
    },
    async startBeginning() {
      await this.startPlayer(0);
    },
    async markComplete() {
      await this.record({ type: "complete" });
      focusAfterUpdate("lesson-complete");
    },
    requestReset() {
      this.resetPending = true;
      focusAfterUpdate("confirm-reset");
    },
    cancelReset() {
      this.resetPending = false;
      focusAfterUpdate("reset-episode");
    },
    async reset() {
      session?.startOver();
      await this.record({ type: "reset" });
      this.resetPending = false;
      focusAfterUpdate("mark-complete");
      this.playerStatus = this.playerStarted
        ? "Back at the beginning. Press play when you’re ready."
        : "";
    },
    saveBeforeNavigation() {
      session?.save();
    },
  };
});
Alpine.start();
