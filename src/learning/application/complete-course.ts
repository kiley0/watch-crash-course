import type { createProgressStore } from "../infrastructure/progress-store";

// Use the same progress transitions and persistence as individual episode completion.
export async function completeCourse(
  videoIds: readonly string[],
  store: Pick<ReturnType<typeof createProgressStore>, "load" | "update">,
) {
  return Promise.all(
    videoIds.map(async (videoId) => {
      const current = await store.load(videoId);
      return current?.completed ? current : store.update(videoId, { type: "complete" });
    }),
  );
}
