import { parseCatalog, parseDetail } from "../domain/course";
import type { Course, CourseDetail } from "../domain/course";

async function fetchJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(new URL(path, document.baseURI), { signal: controller.signal });
    if (!response.ok) throw new Error("The course shelf couldn’t load. Please try again.");
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}
export async function loadCatalog(): Promise<Course[]> {
  return parseCatalog(await fetchJson("./data/courses.json"));
}
export async function loadDetail(course: Course): Promise<CourseDetail> {
  return parseDetail(await fetchJson(`./data/courses/${course.id}.json`), course);
}
