import { describe, expect, it } from "vite-plus/test";
import { createDataRepository } from "./data-repository";
import { updateProgress } from "../../learning/domain/progress";
import type { StorageSnapshot } from "../../site/infrastructure/storage-coordinator";
describe("data repository", () => {
  it("exports, clears, and restores the complete snapshot without catalog metadata", async () => {
    const record = updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 1);
    let data: StorageSnapshot = {
      video_progress: [["video:E7CwqNHn_Ns", record]],
      quiz_attempts: [],
    };
    const repository = createDataRepository({
      async snapshot() {
        return data;
      },
      async replace(next) {
        data = next;
      },
    });
    const backup = await repository.export();
    await repository.clear();
    expect(data.video_progress).toEqual([]);
    await repository.import(backup);
    expect((await repository.export()).videos).toEqual([record]);
  });
  it("does not write an invalid backup and refuses to hide unrecognized saved data on export", async () => {
    let writes = 0;
    const repository = createDataRepository({
      async snapshot() {
        return { video_progress: [["unknown", {}]], quiz_attempts: [] };
      },
      async replace() {
        writes++;
      },
    });
    await expect(repository.import({} as never)).rejects.toThrow();
    await expect(repository.export()).rejects.toThrow("Unrecognized");
    expect(writes).toBe(0);
  });
});
