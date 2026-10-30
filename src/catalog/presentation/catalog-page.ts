import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import { loadCatalog } from "../infrastructure/static-catalog";
import { matchesQuery } from "../domain/search";
import { findShelfSurprise } from "./shelf-surprises";
import type { Course } from "../domain/course";
interface CourseCard extends Course {
  href: string;
  episodeLabel: string;
  linkLabel: string;
}
Alpine.data("catalogPage", () => ({
  courses: [] as CourseCard[],
  query: "",
  subject: "all",
  loading: true,
  error: "",
  get ready(): boolean {
    return !this.loading && !this.error;
  },
  get filteredCourses(): CourseCard[] {
    return this.courses.filter(
      (course) =>
        (this.subject === "all" || course.subject === this.subject) &&
        matchesQuery(this.query, course.title, course.subject, course.host, course.description),
    );
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
      "Try “study,” “notes,” or “Thomas Frank.” We’re starting with one carefully curated course."
    );
  },
  resetFilters() {
    this.query = "";
    this.subject = "all";
  },
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    this.error = "";
    try {
      this.courses = (await loadCatalog()).map((course) => ({
        ...course,
        href: `./course.html?id=${encodeURIComponent(course.id)}`,
        episodeLabel: `${course.episodeCount} episodes`,
        linkLabel: `Explore ${course.title}`,
      }));
    } catch {
      this.error = "The course shelf couldn’t load. Check your connection and try again.";
    } finally {
      this.loading = false;
    }
  },
}));
Alpine.start();
