import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./watch.css";
import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import { isCourseId } from "../../catalog/domain/course";
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
  const visibility = () => {
    if (document.hidden) session?.save();
  };
  const pageHide = () => session?.destroy();
  let stopReloadOnRestore = () => {};
  return {
    course: {} as Course,
    episode: {} as Episode,
    previousUrl: "",
    nextUrl: "",
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
      return `./course.html?id=${encodeURIComponent(this.course.id ?? "")}`;
    },
    get youtubeUrl(): string {
      return this.episode.videoId
        ? videoUrl(this.episode.videoId, this.course.playlistId)
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
    get hasNext(): boolean {
      return !!this.nextUrl;
    },
    get showPlayerChoice(): boolean {
      return !this.playerStarted;
    },
    get canResume(): boolean {
      return resumePosition(this.progress) > 0;
    },
    get resumeLabel(): string {
      return `Resume at ${timeLabel(resumePosition(this.progress))}`;
    },
    get loadLabel(): string {
      return this.progress?.completed
        ? "Load video to watch again"
        : "Load video from the beginning";
    },
    get savedLabel(): string {
      if (!this.progress) return "Your next good idea starts here.";
      if (this.storageWarning) return "Progress is temporary in this tab.";
      return this.isCompleted
        ? "Completed · saved in this browser."
        : `Your place: ${timeLabel(this.progress.position)} · saved in this browser.`;
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
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("course");
        const videoId = params.get("video");
        if (!id || !isCourseId(id) || !videoId) throw new Error("Unknown lesson");
        const course = (await loadCatalog()).find((item) => item.id === id);
        if (!course) throw new Error("Unknown course");
        const detail = await loadDetail(course);
        const index = detail.episodes.findIndex((episode) => episode.videoId === videoId);
        const episode = detail.episodes[index];
        if (!episode) throw new Error("Unknown lesson");
        this.course = course;
        this.episode = episode;
        const previous = detail.episodes[index - 1];
        const next = detail.episodes[index + 1];
        this.previousUrl = previous ? watchUrl(course.id, previous.videoId) : "";
        this.nextUrl = next ? watchUrl(course.id, next.videoId) : "";
        this.progress = await progressStore.load(videoId);
        this.storageWarning = progressStore.warning;
        document.title = `${episode.title} · ${course.title} · Crash Course University`;
      } catch {
        this.error =
          "We couldn’t open this lesson. Check your connection or choose an episode from the course shelf.";
      } finally {
        this.loading = false;
      }
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
      session = createYouTubePlayer(
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
      );
      try {
        await session.start(seconds);
      } catch {
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
    },
    requestReset() {
      this.resetPending = true;
    },
    cancelReset() {
      this.resetPending = false;
    },
    async reset() {
      session?.startOver();
      await this.record({ type: "reset" });
      this.resetPending = false;
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
