import Alpine from "@alpinejs/csp";
import "../../site/styles.css";
import "./settings.css";
import { MAX_BACKUP_BYTES, readBackup } from "../domain/backup";
import type { Backup } from "../domain/backup";
import { createDataRepository } from "../infrastructure/data-repository";
import { browserStorage } from "../../site/infrastructure/browser-storage";
import { reloadOnRestore } from "../../site/reload-on-restore";
const repository = createDataRepository(browserStorage);
function recordCounts(backup: Backup): string {
  const videos = backup.videos.length;
  return `${videos} saved ${videos === 1 ? "video" : "videos"}`;
}
Alpine.data("settingsPage", () => {
  let stopRestore = () => {};
  let disposed = false;
  function focus(id: string) {
    void Alpine.nextTick(() =>
      requestAnimationFrame(() => {
        if (!disposed) document.getElementById(id)?.focus();
      }),
    );
  }
  return {
    busy: false,
    loading: true,
    error: "",
    message: "",
    current: null as Backup | null,
    pending: null as Backup | null,
    clearPending: false,
    get summary(): string {
      if (!this.current) return "Saved data couldn’t be read. Try refreshing.";
      return recordCounts(this.current);
    },
    get importSummary(): string {
      if (!this.pending) return "";
      return `${recordCounts(this.pending)} · Backed up ${new Date(this.pending.exportedAt).toLocaleString()}.`;
    },
    get canExport(): boolean {
      return !this.busy && !this.loading && !!this.current;
    },
    async init() {
      stopRestore = reloadOnRestore();
      await this.refresh();
    },
    destroy() {
      disposed = true;
      stopRestore();
    },
    async checkData() {
      if (this.busy || this.loading) return;
      await this.refresh();
      focus("refresh-data");
    },
    async refresh() {
      this.loading = true;
      this.error = "";
      try {
        this.current = await repository.export();
      } catch (error) {
        this.current = null;
        this.error = error instanceof Error ? error.message : "Saved data couldn’t be read.";
      } finally {
        this.loading = false;
      }
    },
    async download() {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      this.message = "";
      try {
        const backup = await repository.export();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        if (blob.size > MAX_BACKUP_BYTES)
          throw new Error(
            "This backup is larger than the supported 5 MB limit. Nothing was changed.",
          );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `watch-crash-course-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        // Allow the browser to begin the download before releasing the object URL.
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.current = backup;
        this.message = "Backup download started.";
      } catch (error) {
        this.error = error instanceof Error ? error.message : "The backup couldn’t be downloaded.";
      } finally {
        this.busy = false;
      }
    },
    async chooseFile(event: Event) {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      if (!file || this.busy) return;
      this.pending = null;
      this.clearPending = false;
      this.error = "";
      this.message = "";
      this.busy = true;
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error("Choose a backup smaller than 5 MB.");
        this.pending = readBackup(await file.text());
        focus("confirm-import");
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "This backup couldn’t be read. Nothing was changed.";
      } finally {
        input.value = "";
        this.busy = false;
      }
    },
    cancelImport() {
      if (this.busy) return;
      this.pending = null;
      focus("backup-file");
    },
    async confirmImport() {
      if (!this.pending || this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        await repository.import(this.pending);
        this.pending = null;
        await this.refresh();
        this.message = "Backup imported.";
        focus("data-message");
      } catch (error) {
        this.error = error instanceof Error ? error.message : "The backup couldn’t be restored.";
      } finally {
        this.busy = false;
      }
    },
    requestClear() {
      this.error = "";
      this.pending = null;
      this.clearPending = true;
      this.message = "";
      focus("confirm-clear");
    },
    cancelClear() {
      if (this.busy) return;
      this.clearPending = false;
      focus("clear-data");
    },
    async clear() {
      if (!this.clearPending || this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        await repository.clear();
        this.clearPending = false;
        await this.refresh();
        this.message = "Saved data cleared.";
        focus("data-message");
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Saved data couldn’t be cleared.";
      } finally {
        this.busy = false;
      }
    },
  };
});
Alpine.start();
