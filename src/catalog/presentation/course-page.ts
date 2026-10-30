import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import { loadCatalog, loadDetail } from "../infrastructure/static-catalog";
import { isCourseId } from "../domain/course";
import { matchesQuery } from "../domain/search";
import { videoUrl } from "./youtube-links";
import type { Course, Episode } from "../domain/course";
interface EpisodeLink extends Episode {
  href: string;
  displayNumber: string;
}
Alpine.data("coursePage", () => ({
  course: {} as Course,
  episodes: [] as EpisodeLink[],
  query: "",
  loading: true,
  error: "",
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
    return `All ${this.course.episodeCount} numbered episodes, in order. The course preview is optional and isn’t counted as a lesson.`;
  },
  get firstVideoUrl(): string {
    return this.episodes[0]?.href ?? "https://www.youtube.com/user/crashcourse";
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
    await this.load();
  },
  async load() {
    this.loading = true;
    this.error = "";
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
      this.episodes = detail.episodes.map((episode) => ({
        ...episode,
        displayNumber: String(episode.number).padStart(2, "0"),
        href: videoUrl(episode.videoId, course.playlistId),
      }));
      document.title = `${course.title} · Crash Course University`;
    } catch {
      this.error = "We couldn’t load this course. Check your connection and try again.";
    } finally {
      this.loading = false;
    }
  },
}));
Alpine.start();
