import { loadCatalog, loadDetail, loadCourseSearch } from "../infrastructure/static-catalog";
import { matchesQuery } from "../domain/search";
import { fitHeroDescriptions } from "./hero-descriptions";
import { findShelfSurprise } from "./shelf-surprises";
import { coursesInCollection } from "../domain/course";
import type { Collection, Course, CourseDetail } from "../domain/course";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import {
  courseProgressStatus,
  mostRecentUnfinished,
  summarizeCourse,
} from "../../learning/domain/course-summary";
import { recommendedEpisode } from "../../learning/domain/recommended-episode";
import { resumePosition } from "../../learning/domain/progress";
import { timeLabel } from "../../learning/presentation/progress-labels";
import type { CourseSummary } from "../../learning/domain/course-summary";
import { watchUrl } from "../../playback/presentation/watch-links";
import { refreshOnRestore } from "../../site/reload-on-restore";
interface CourseCard extends Course {
  href: string;
  episodeLabel: string;
  summary: CourseSummary | null;
  progressLabel: string;
  percent: number;
  continueHref: string;
  continueLabel: string;
  continueDetail: string;
  recommendationHref: string;
  recommendationDescription: string;
  nextEpisodeTitle: string;
  nextEpisodeLabel: string;
}
export function createCatalogPage(collection: Collection) {
  let stopRefreshOnRestore = () => {};
  let stopHeroDescriptions = () => {};
  let destroyed = false;
  let refreshVersion = 0;
  const details = new Map<string, CourseDetail>();
  return {
    courses: [] as CourseCard[],
    randomCourseIds: [] as string[],
    query: "",
    episodeSearch: {} as Record<string, string>,
    searchLoading: false,
    searchLoaded: false,
    searchWarning: "",
    subject: "all",
    progress: "all",
    loading: true,
    error: "",
    storageWarning: "",
    resumeVideoId: null as string | null,
    get ready(): boolean {
      return !this.loading && !this.error;
    },
    get subjects(): string[] {
      return [...new Set(this.courses.map((course) => course.subject))].toSorted();
    },
    get filteredCourses(): CourseCard[] {
      return this.courses.filter(
        (course) =>
          (this.subject === "all" || course.subject === this.subject) &&
          (this.progress === "all" || courseProgressStatus(course.summary) === this.progress) &&
          matchesQuery(
            this.query,
            course.title,
            course.subject,
            course.host,
            course.description,
            course.series ?? "",
            this.episodeSearch[course.id] ?? "",
          ),
      );
    },
    get recentCourses(): CourseCard[] {
      return this.courses
        .filter((course) => course.summary && course.summary.lastActivityAt > 0)
        .toSorted((a, b) => b.summary!.lastActivityAt - a.summary!.lastActivityAt)
        .slice(0, 5);
    },
    get heroCourses(): CourseCard[] {
      return this.courses
        .filter(
          (course) =>
            courseProgressStatus(course.summary) === "in-progress" && course.recommendationHref,
        )
        .toSorted((a, b) => b.summary!.lastActivityAt - a.summary!.lastActivityAt)
        .slice(0, 5);
    },
    get heroStarterIds(): string[] {
      return this.randomCourseIds
        .filter((id) => {
          const course = this.courses.find((item) => item.id === id);
          return (
            !!course?.recommendationHref && courseProgressStatus(course.summary) === "not-started"
          );
        })
        .slice(0, 5 - this.heroCourses.length);
    },
    get heroSuggestions(): CourseCard[] {
      const starters = this.heroStarterIds.flatMap((id) => {
        const course = this.courses.find((item) => item.id === id);
        return course?.nextEpisodeTitle ? [course] : [];
      });
      return [...this.heroCourses, ...starters];
    },
    get hasHeroCourses(): boolean {
      return this.heroCourses.length > 0;
    },
    get featuredCourses(): CourseCard[] {
      const course = this.resumeVideoId
        ? this.courses.find((item) => item.summary?.continueVideoId === this.resumeVideoId)
        : undefined;
      return course ? [course] : this.recentCourses.slice(0, 1);
    },
    get hasRecentCourses(): boolean {
      return this.ready && this.recentCourses.length > 0;
    },
    get shelves(): { subject: string; courses: CourseCard[]; label: string }[] {
      const courses = this.filteredCourses;
      return this.subjects
        .map((subject) => {
          const books = courses.filter((course) => course.subject === subject);
          return {
            subject,
            courses: books,
            label: `${books.length} ${books.length === 1 ? "course" : "courses"}`,
          };
        })
        .filter((shelf) => shelf.courses.length > 0);
    },
    get empty(): boolean {
      return !(this.searchLoading && this.query.trim()) && this.filteredCourses.length === 0;
    },
    get resultLabel(): string {
      const count = this.filteredCourses.length;
      return this.searchLoading && this.query.trim()
        ? "Searching course and episode descriptions…"
        : `${count} ${count === 1 ? "course" : "courses"} to explore`;
    },
    get emptyHeading(): string {
      return findShelfSurprise(this.query)?.heading ?? "No courses found. Keep exploring!";
    },
    get emptyMessage(): string {
      return (
        findShelfSurprise(this.query)?.message ??
        "Try a subject like “history” or “science,” a course title, or a host’s name."
      );
    },
    async searchCourses(event: Event) {
      this.query = (event.target as HTMLInputElement).value;
      if (!this.query.trim()) this.searchWarning = "";
      await this.loadEpisodeSearch();
    },
    async loadEpisodeSearch() {
      if (!this.query.trim() || this.searchLoaded || this.searchLoading || destroyed) return;
      this.searchLoading = true;
      this.searchWarning = "";
      try {
        const index = await loadCourseSearch(collection);
        if (destroyed) return;
        this.episodeSearch = index;
        this.searchLoaded = true;
      } catch {
        if (!destroyed && this.query.trim())
          this.searchWarning =
            "Episode descriptions couldn’t load. Results still include course details. Try typing your search again to retry.";
      } finally {
        this.searchLoading = false;
      }
    },
    resetFilters() {
      this.query = "";
      this.searchWarning = "";
      this.subject = "all";
      this.progress = "all";
    },
    async init() {
      stopRefreshOnRestore = refreshOnRestore(() => this.refreshProgress());
      await this.load();
      const book =
        collection === "crash-course"
          ? document.querySelector<HTMLElement>(".curiosity-notebook")
          : null;
      if (book && !destroyed) stopHeroDescriptions = fitHeroDescriptions(book);
    },
    destroy() {
      destroyed = true;
      stopRefreshOnRestore();
      stopHeroDescriptions();
      refreshVersion++;
    },
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const catalog = coursesInCollection(await loadCatalog(), collection);
        // Shuffle once per visit so reactive updates and filters do not reshuffle the page.
        const shuffled = collection === "crash-course" ? [...catalog] : [];
        for (let index = shuffled.length - 1; index > 0; index--) {
          const target = Math.floor(Math.random() * (index + 1));
          [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
        }
        this.randomCourseIds = shuffled.map((course) => course.id);
        this.courses = catalog.map((course) => ({
          ...course,
          href: `./course.html?id=${encodeURIComponent(course.id)}`,
          episodeLabel: `${course.episodeCount} episodes`,
          summary: null,
          progressLabel: "Loading progress…",
          percent: 0,
          continueHref: `./course.html?id=${encodeURIComponent(course.id)}`,
          continueLabel: "Continue learning",
          continueDetail: "",
          recommendationHref: "",
          recommendationDescription: "",
          nextEpisodeTitle: "",
          nextEpisodeLabel: "",
        }));
        // The shelf is usable while saved progress and episode memberships load.
        this.loading = false;
        await this.refreshProgress();
      } catch {
        this.error = "The course shelf couldn’t load. Check your connection and try again.";
      } finally {
        this.loading = false;
      }
    },
    async refreshProgress() {
      const version = ++refreshVersion;
      const records = await progressStore.refresh();
      if (version !== refreshVersion) return;
      this.storageWarning = progressStore.warning;
      this.resumeVideoId = null;
      const enrichCourse = async (
        course: CourseCard,
        index: number,
        loadRecommendation = false,
      ) => {
        let summary: CourseSummary | null = null;
        let continueDetail = "";
        let recommendationHref = "";
        let recommendationDescription = "";
        let nextEpisodeTitle = "";
        let nextEpisodeLabel = "";
        try {
          if (records.length === 0) {
            // With no records, every course is unstarted regardless of membership.
            summary = {
              total: course.episodeCount,
              completed: 0,
              percent: 0,
              lastActivityAt: 0,
              continueVideoId: null,
              isComplete: false,
            };
          }
          if (
            records.length > 0 ||
            loadRecommendation ||
            this.randomCourseIds.slice(0, 5).includes(course.id)
          ) {
            // Check every membership: a video can belong to more than one course.
            const detail = details.get(course.id) ?? (await loadDetail(course));
            details.set(course.id, detail);
            summary = summarizeCourse(
              detail.episodes.map((episode) => episode.videoId),
              records,
            );
            const recommendedId = recommendedEpisode(
              detail.episodes.map((entry) => entry.videoId),
              records,
            );
            const recommendation = detail.episodes.find((item) => item.videoId === recommendedId);
            const recommendationPosition = resumePosition(
              records.find((record) => record.videoId === recommendation?.videoId) ?? null,
            );
            recommendationHref = recommendation ? watchUrl(course.id, recommendation.videoId) : "";
            recommendationDescription = recommendation?.description ?? course.description;
            nextEpisodeTitle = recommendation?.title ?? "";
            nextEpisodeLabel = recommendation
              ? `${recommendationPosition > 0 ? "Resume" : "Watch"} episode ${recommendation.number}`
              : "";
            continueDetail = summary.isComplete
              ? "Revisit the course from the beginning."
              : recommendation
                ? recommendationPosition > 0
                  ? `Resume ${recommendation.title} at ${timeLabel(recommendationPosition)}.`
                  : `Up next: ${recommendation.title}.`
                : "";
          }
        } catch {
          /* An unavailable detail file must not hide the course shelf. */
        }
        if (version !== refreshVersion) return;
        this.courses[index] = {
          ...course,
          summary,
          percent: summary?.percent ?? 0,
          progressLabel: summary
            ? `${summary.completed} of ${summary.total} completed`
            : "Progress unavailable",
          continueHref:
            recommendationHref ||
            (summary?.continueVideoId ? watchUrl(course.id, summary.continueVideoId) : course.href),
          continueLabel: summary?.isComplete ? "Watch again" : "Continue learning",
          continueDetail,
          recommendationHref,
          recommendationDescription,
          nextEpisodeTitle,
          nextEpisodeLabel,
        };
        this.resumeVideoId = mostRecentUnfinished(
          records,
          this.courses.flatMap((item) =>
            item.summary?.continueVideoId ? [item.summary.continueVideoId] : [],
          ),
        );
      };
      await Promise.all(this.courses.map((course, index) => enrichCourse(course, index)));
      // Replace unavailable random picks without downloading every detail on a new visit.
      if (records.length === 0) {
        for (const id of this.randomCourseIds.slice(5)) {
          if (version !== refreshVersion || this.heroSuggestions.length >= 5) break;
          const index = this.courses.findIndex((course) => course.id === id);
          await enrichCourse(this.courses[index]!, index, true);
        }
      }
    },
  };
}
