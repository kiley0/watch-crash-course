import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./chapter-link.css";
import "./catalog.css";
import "./notebook-hero.css";
import { createCatalogPage } from "./catalog-component";
import { pickUnseenEpisode } from "../domain/random-episode";
import { coursesInCollection } from "../domain/course";
import { loadCatalog, loadDetail } from "../infrastructure/static-catalog";
import { progressStore } from "../../learning/infrastructure/browser-progress";
import { watchUrl } from "../../playback/presentation/watch-links";
Alpine.data("catalogPage", () => createCatalogPage("crash-course"));

Alpine.data("randomEpisode", () => ({
  busy: false,
  message: "",
  get label(): string {
    return this.busy ? "Finding an episode…" : "Take me to a random video";
  },
  async discover() {
    if (this.busy) return;
    this.busy = true;
    this.message = "";
    try {
      const [allCourses, records] = await Promise.all([loadCatalog(), progressStore.list()]);
      const catalog = coursesInCollection(allCourses, "crash-course");
      const details = await Promise.allSettled(catalog.map((course) => loadDetail(course)));
      const episodes = details.flatMap((result) =>
        result.status === "fulfilled"
          ? result.value.episodes.map((episode) => ({
              courseId: result.value.courseId,
              videoId: episode.videoId,
            }))
          : [],
      );
      const choice = pickUnseenEpisode(
        episodes,
        records.map((record) => record.videoId),
      );
      if (choice) {
        window.location.assign(watchUrl(choice.courseId, choice.videoId));
      } else {
        this.message = details.some((result) => result.status === "rejected")
          ? "Some courses couldn’t load. Try again or explore the library."
          : "You’ve visited every episode! Pick a favorite from the library to watch again.";
      }
    } catch {
      this.message = "We couldn’t find an episode. Try again or explore the library.";
    } finally {
      this.busy = false;
    }
  },
}));
Alpine.start();
