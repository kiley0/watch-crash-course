import { expect, it } from "vite-plus/test";
import { pickUnseenEpisode } from "./random-episode";

const episodes = [
  { courseId: "one", videoId: "first" },
  { courseId: "one", videoId: "second" },
  { courseId: "two", videoId: "third" },
];
it("excludes any saved video and selects across the remaining episodes", () => {
  expect(pickUnseenEpisode(episodes, ["second"], () => 0)).toEqual(episodes[0]);
  expect(pickUnseenEpisode(episodes, ["second"], () => 0.999)).toEqual(episodes[2]);
});
it("does not give shared videos extra chances", () => {
  expect(pickUnseenEpisode([...episodes, episodes[0]!], [], () => 0.999)).toEqual(episodes[2]);
});
it("returns no choice for an empty or fully watched library", () => {
  expect(pickUnseenEpisode([], [])).toBeNull();
  expect(
    pickUnseenEpisode(
      episodes,
      episodes.map((episode) => episode.videoId),
    ),
  ).toBeNull();
});
