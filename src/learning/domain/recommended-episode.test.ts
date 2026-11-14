import { expect, it } from "vite-plus/test";
import { recommendedEpisode } from "./recommended-episode";
import { updateProgress } from "./progress";
const ids = ["E7CwqNHn_Ns", "WAIUkjsZ5xQ", "SZbdK9e9bxs"];
const watching = (id: string, time: number, position = 30) =>
  updateProgress(null, id, { type: "playback", position, duration: 100 }, time);
const complete = (id: string, time: number) => updateProgress(null, id, { type: "complete" }, time);

it("starts at the beginning without activity and ignores reset or unrelated records", () => {
  expect(recommendedEpisode(ids, [])).toBe(ids[0]);
  expect(recommendedEpisode(ids, [watching("unrelated01", 10)])).toBe(ids[0]);
  expect(
    recommendedEpisode(ids, [updateProgress(watching(ids[1]!, 1), ids[1]!, { type: "reset" }, 2)]),
  ).toBe(ids[0]);
});
it("resumes the most recent unfinished episode but follows a newer completion", () => {
  expect(recommendedEpisode(ids, [watching(ids[1]!, 2), watching(ids[0]!, 1)])).toBe(ids[1]);
  expect(recommendedEpisode(ids, [watching(ids[0]!, 1), complete(ids[1]!, 3)])).toBe(ids[2]);
});
it("moves past near-finished episodes and completed successors, wrapping to missed lessons at the end", () => {
  expect(recommendedEpisode(ids, [watching(ids[0]!, 3, 98), complete(ids[1]!, 2)])).toBe(ids[2]);
  expect(recommendedEpisode(ids, [complete(ids[2]!, 3)])).toBe(ids[0]);
  expect(
    recommendedEpisode(
      ids,
      ids.map((id, i) => complete(id, i + 1)),
    ),
  ).toBeNull();
  expect(recommendedEpisode([], [])).toBeNull();
});
