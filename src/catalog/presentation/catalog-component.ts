import { loadCatalog, loadDetail } from "../infrastructure/static-catalog";
import { matchesQuery } from "../domain/search";
import { findShelfSurprise } from "./shelf-surprises";
import { coursesInCollection } from "../domain/course";
import type { Collection, Course, CourseDetail } from "../domain/course";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import {
  courseProgressStatus,
  mostRecentUnfinished,
  summarizeCourse,
} from "../../learning/domain/course-summary";
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
  nextEpisodeTitle: string;
  nextEpisodeLabel: string;
}
export function createCatalogPage(collection: Collection) {
  let stopRefreshOnRestore = () => {};
  let refreshVersion = 0;
  const details = new Map<string, CourseDetail>();
  return {
    courses: [] as CourseCard[],
    query: "",
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
            courseProgressStatus(course.summary) === "in-progress" &&
            course.summary?.continueVideoId,
        )
        .toSorted((a, b) => b.summary!.lastActivityAt - a.summary!.lastActivityAt)
        .slice(0, 3);
    },
    get heroStarterIds(): string[] {
      const active = this.heroCourses;
      return ["astronomy", "philosophy", "botany"]
        .filter((id) => !active.some((course) => course.id === id))
        .slice(0, 3 - active.length);
    },
    get showAstronomyStarter(): boolean {
      return this.heroStarterIds.includes("astronomy");
    },
    get showPhilosophyStarter(): boolean {
      return this.heroStarterIds.includes("philosophy");
    },
    get showBotanyStarter(): boolean {
      return this.heroStarterIds.includes("botany");
    },
    starterSlot(id: string): number {
      return this.heroCourses.length + this.heroStarterIds.indexOf(id) + 1;
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
      return this.filteredCourses.length === 0;
    },
    get resultLabel(): string {
      const count = this.filteredCourses.length;
      return `${count} ${count === 1 ? "course" : "courses"} to explore`;
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
    resetFilters() {
      this.query = "";
      this.subject = "all";
      this.progress = "all";
    },
    async init() {
      stopRefreshOnRestore = refreshOnRestore(() => this.refreshProgress());
      await this.load();
    },
    destroy() {
      stopRefreshOnRestore();
      refreshVersion++;
    },
    async load() {
      this.loading = true;
      this.error = "";
      try {
        const catalog = coursesInCollection(await loadCatalog(), collection);
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
      await Promise.all(
        this.courses.map(async (course, index) => {
          let summary: CourseSummary | null = null;
          let continueDetail = "";
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
            } else {
              // Check every membership: a video can belong to more than one course.
              const detail = details.get(course.id) ?? (await loadDetail(course));
              details.set(course.id, detail);
              summary = summarizeCourse(
                detail.episodes.map((episode) => episode.videoId),
                records,
              );
              const episode = detail.episodes.find(
                (item) => item.videoId === summary?.continueVideoId,
              );
              const position = resumePosition(
                records.find((record) => record.videoId === episode?.videoId) ?? null,
              );
              nextEpisodeTitle = episode?.title ?? "";
              nextEpisodeLabel = episode
                ? `${position > 0 ? "Resume" : "Watch"} episode ${episode.number}`
                : "";
              continueDetail = summary.isComplete
                ? "Revisit the course from the beginning."
                : episode
                  ? position > 0
                    ? `Resume ${episode.title} at ${timeLabel(position)}.`
                    : `Up next: ${episode.title}.`
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
            continueHref: summary?.continueVideoId
              ? watchUrl(course.id, summary.continueVideoId)
              : course.href,
            continueLabel: summary?.isComplete ? "Watch again" : "Continue learning",
            continueDetail,
            nextEpisodeTitle,
            nextEpisodeLabel,
          };
          this.resumeVideoId = mostRecentUnfinished(
            records,
            this.courses.flatMap((item) =>
              item.summary?.continueVideoId ? [item.summary.continueVideoId] : [],
            ),
          );
        }),
      );
    },
  };
}
