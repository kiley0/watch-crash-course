import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./history.css";
import { progressStore } from "../infrastructure/browser-progress";
import type { VideoProgress } from "../domain/progress";
import { historyEntries } from "./history-entries";
import type { HistoryEntry, HistoryMetadata } from "./history-entries";
import { loadCatalog, loadDetail } from "../../catalog/infrastructure/static-catalog";
import { collectionLabel } from "../../catalog/domain/course";
import { matchesQuery } from "../../catalog/domain/search";
import { watchUrl } from "../../playback/presentation/watch-links";
import { refreshOnRestore } from "../../site/reload-on-restore";
Alpine.data("historyPage", () => {
  let stopRefreshOnRestore = () => {};
  let records: VideoProgress[] = [];
  let known = new Map<string, HistoryMetadata>();
  return {
    entries: [] as HistoryEntry[],
    query: "",
    status: "all",
    loading: true,
    storageWarning: "",
    catalogWarning: "",
    metadataLoading: false,
    get filteredEntries(): HistoryEntry[] {
      return this.entries.filter(
        (entry) =>
          (this.status === "all" ||
            (this.status === "completed" ? entry.completed : !entry.completed)) &&
          matchesQuery(this.query, entry.title, entry.context, entry.videoId),
      );
    },
    get hasEntries(): boolean {
      return !this.loading && this.entries.length > 0;
    },
    get emptyHeading(): string {
      return this.storageWarning
        ? "Your history couldn’t be opened."
        : "A good place for a beginning.";
    },
    get emptyMessage(): string {
      return this.storageWarning
        ? "You can still explore the courses. Your existing saved data hasn’t been cleared."
        : "No viewing history in this browser yet. Choose a lesson and we’ll save you a place.";
    },
    get empty(): boolean {
      return !this.loading && this.entries.length === 0;
    },
    get noMatches(): boolean {
      return this.entries.length > 0 && this.filteredEntries.length === 0;
    },
    get resultLabel(): string {
      return `${this.filteredEntries.length} of ${this.entries.length} saved episodes`;
    },
    resetFilters() {
      this.query = "";
      this.status = "all";
    },
    async init() {
      stopRefreshOnRestore = refreshOnRestore(() => this.refreshProgress());
      records = await progressStore.list();
      this.storageWarning = progressStore.warning;
      this.entries = historyEntries(records);
      this.loading = false;
      if (this.entries.length) await this.loadMetadata();
    },
    destroy() {
      stopRefreshOnRestore();
    },
    async refreshProgress() {
      records = await progressStore.refresh();
      this.storageWarning = progressStore.warning;
      this.entries = historyEntries(records, known);
      if (records.length && !known.size && !this.metadataLoading) await this.loadMetadata();
    },
    async loadMetadata() {
      this.metadataLoading = true;
      this.catalogWarning = "";
      try {
        const courses = await loadCatalog();
        const details = await Promise.allSettled(
          courses.map(async (course) => ({ course, detail: await loadDetail(course) })),
        );
        known = new Map<string, HistoryMetadata>();
        for (const result of details) {
          if (result.status !== "fulfilled") continue;
          const { course, detail } = result.value;
          for (const episode of detail.episodes) {
            if (!known.has(episode.videoId))
              known.set(episode.videoId, {
                title: episode.title,
                context: `${collectionLabel(course)} · ${course.title}`,
                href: watchUrl(course.id, episode.videoId),
              });
          }
        }
        this.entries = historyEntries(records, known);
        if (details.some((result) => result.status === "rejected"))
          this.catalogWarning =
            "Some course details couldn’t load. Your saved history is still available below.";
      } catch {
        this.entries = historyEntries(records);
        this.catalogWarning =
          "Course names couldn’t load. Your saved history is still here, with links to the original videos.";
      } finally {
        this.metadataLoading = false;
      }
    },
  };
});
Alpine.start();
