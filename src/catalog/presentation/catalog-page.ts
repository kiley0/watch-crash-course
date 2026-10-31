import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import { loadCatalog, loadDetail } from "../infrastructure/static-catalog";
import { matchesQuery } from "../domain/search";
import { findShelfSurprise } from "./shelf-surprises";
import type { Course } from "../domain/course";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import { mostRecentUnfinished, summarizeCourse } from "../../learning/domain/course-summary";
import { resumePosition } from "../../learning/domain/progress";
import { timeLabel } from "../../learning/presentation/progress-labels";
import type { CourseSummary } from "../../learning/domain/course-summary";
import { watchUrl } from "../../playback/presentation/watch-links";
import { reloadOnRestore } from "../../site/reload-on-restore";
interface CourseCard extends Course {
  href: string;
  episodeLabel: string;
  linkLabel: string;
  summary: CourseSummary | null;
  progressLabel: string;
  percent: number;
  continueHref: string;
  continueLabel: string;
  continueDetail: string;
}
Alpine.data("catalogPage", () => {
  let stopReloadOnRestore = () => {};
  return {
    courses: [] as CourseCard[],
    query: "",
    subject: "all",
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
          matchesQuery(this.query, course.title, course.subject, course.host, course.description),
      );
    },
    get recentCourses(): CourseCard[] {
      return this.courses
        .filter((course) => course.summary && course.summary.lastActivityAt > 0)
        .toSorted((a, b) => b.summary!.lastActivityAt - a.summary!.lastActivityAt)
        .slice(0, 3);
    },
    get featuredCourses(): CourseCard[] {
      const course = this.resumeVideoId
        ? this.courses.find((item) => item.summary?.continueVideoId === this.resumeVideoId)
        : undefined;
      return course ? [course] : this.recentCourses.slice(0, 1);
    },
    get otherRecentCourses(): CourseCard[] {
      return this.recentCourses.filter((course) => course.id !== this.featuredCourses[0]?.id);
    },
    get hasRecentCourses(): boolean {
      return this.ready && this.recentCourses.length > 0;
    },
    get showShelfNote(): boolean {
      return !this.query.trim() && this.subject === "all";
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
      try {
        const catalog = await loadCatalog();
        const records = await progressStore.list();
        this.courses = await Promise.all(
          catalog.map(async (course) => {
            let summary: CourseSummary | null = null;
            let continueDetail = "";
            try {
              const detail = await loadDetail(course);
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
              continueDetail = summary.isComplete
                ? "Revisit the course from the beginning."
                : episode
                  ? position > 0
                    ? `Resume ${episode.title} at ${timeLabel(position)}.`
                    : `Up next: ${episode.title}.`
                  : "";
            } catch {
              /* An unavailable detail file must not hide the course shelf. */
            }
            const href = `./course.html?id=${encodeURIComponent(course.id)}`;
            return {
              ...course,
              href,
              episodeLabel: `${course.episodeCount} episodes`,
              linkLabel: `Explore ${course.title}`,
              summary,
              percent: summary?.percent ?? 0,
              progressLabel: summary
                ? `${summary.completed} of ${summary.total} completed`
                : "Progress unavailable",
              continueHref: summary?.continueVideoId
                ? watchUrl(course.id, summary.continueVideoId)
                : href,
              continueLabel: summary?.isComplete ? "Watch again" : "Continue learning",
              continueDetail,
            };
          }),
        );
        this.resumeVideoId = mostRecentUnfinished(
          records,
          this.courses.flatMap((course) =>
            course.summary?.continueVideoId ? [course.summary.continueVideoId] : [],
          ),
        );
        this.storageWarning = progressStore.warning;
      } catch {
        this.error = "The course shelf couldn’t load. Check your connection and try again.";
      } finally {
        this.loading = false;
      }
    },
  };
});
Alpine.start();
