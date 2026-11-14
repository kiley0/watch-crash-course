import type { createProgressStore } from "../infrastructure/progress-store";

// Progress belongs to videos, so shared episodes reset in every course that includes them.
export async function resetCourse(
  videoIds: readonly string[],
  store: Pick<ReturnType<typeof createProgressStore>, "load" | "update">,
) {
  return Promise.all(
    [...new Set(videoIds)].map(async (videoId) => {
      const current = await store.load(videoId);
      return current && (current.completed || current.position > 0)
        ? store.update(videoId, { type: "reset" })
        : current;
    }),
  );
}
