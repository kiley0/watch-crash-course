import { expect, it } from "vite-plus/test";
import { chooseThoughtBubble, thoughtBubbles } from "./thought-bubbles";

const details = import.meta.glob("../../../public/data/courses/*.json", {
  eager: true,
  import: "default",
});
it("links every sourced quote to a real episode in its course", () => {
  expect(thoughtBubbles).toHaveLength(40);
  expect(new Set(thoughtBubbles.map((thought) => thought.text)).size).toBe(40);
  for (const thought of thoughtBubbles) {
    const detail = details[`../../../public/data/courses/${thought.courseId}.json`] as {
      episodes: { videoId: string }[];
    };
    expect(detail.episodes.some((episode) => episode.videoId === thought.videoId)).toBe(true);
    expect(thought.transcriptUrl).toBe(`https://nerdfighteria.info/v/${thought.videoId}/`);
  }
});
it("can select both ends of the quote set", () => {
  expect(chooseThoughtBubble(() => 0)).toBe(thoughtBubbles[0]);
  expect(chooseThoughtBubble(() => 0.999)).toBe(thoughtBubbles.at(-1));
});
