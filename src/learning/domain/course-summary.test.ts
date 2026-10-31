import { describe, expect, it } from "vite-plus/test";
import {
  courseProgressStatus,
  mostRecentUnfinished,
  summarizeCourse,
  viewingHistory,
} from "./course-summary";
import { updateProgress } from "./progress";
const first = "E7CwqNHn_Ns",
  second = "WAIUkjsZ5xQ",
  third = "SZbdK9e9bxs";
const complete = (id: string, time: number) => updateProgress(null, id, { type: "complete" }, time);
const watching = (id: string, time: number) =>
  updateProgress(null, id, { type: "playback", position: 30, duration: 100 }, time);
describe("derived course progress", () => {
  it("starts a new profile at the first episode, without invented activity", () => {
    expect(summarizeCourse([first, second], [])).toEqual({
      total: 2,
      completed: 0,
      percent: 0,
      lastActivityAt: 0,
      continueVideoId: first,
      isComplete: false,
    });
    expect(summarizeCourse([], [])).toMatchObject({
      percent: 0,
      continueVideoId: null,
      isComplete: false,
    });
  });
  it("resumes the most recent unfinished video even after another video is completed", () => {
    const records = [watching(first, 1), watching(second, 3), complete(third, 4)];
    expect(summarizeCourse([first, second, third], records)).toMatchObject({
      continueVideoId: second,
      lastActivityAt: 4,
      completed: 1,
      percent: 33,
    });
  });
  it("uses current membership and order for additions, removals, and reordering", () => {
    const records = [complete(first, 1), complete(second, 2)];
    expect(summarizeCourse([second, first], records)).toMatchObject({
      percent: 100,
      isComplete: true,
      continueVideoId: second,
    });
    expect(summarizeCourse([third, second, first], records)).toMatchObject({
      percent: 67,
      isComplete: false,
      continueVideoId: third,
    });
    expect(summarizeCourse([first, third], records)).toMatchObject({
      total: 2,
      completed: 1,
      lastActivityAt: 1,
      continueVideoId: third,
    });
    expect(records).toHaveLength(2);
  });
  it("preserves completion through replay and shares progress across course membership", () => {
    const replay = updateProgress(
      complete(first, 1),
      first,
      { type: "playback", position: 10, duration: 100 },
      5,
    );
    expect(summarizeCourse([first], [replay]).isComplete).toBe(true);
    expect(summarizeCourse([first, second], [replay]).completed).toBe(1);
  });
  it("finds the latest unfinished video across courses, ignoring removed videos", () => {
    const records = [watching(first, 1), watching(second, 3), complete(third, 9)];
    expect(mostRecentUnfinished(records, [first, second, third])).toBe(second);
    expect(mostRecentUnfinished(records, [first, third])).toBe(first);
    expect(mostRecentUnfinished(records, [third])).toBeNull();
  });
  it("keeps removed videos in history and omits reset records", () => {
    const reset = updateProgress(complete(first, 1), first, { type: "reset" }, 6);
    const records = [watching(second, 2), reset, complete(third, 4)];
    expect(viewingHistory(records).map((record) => record.videoId)).toEqual([third, second]);
    expect(summarizeCourse([first], records)).toMatchObject({ completed: 0, lastActivityAt: 0 });
    expect(records[0]?.videoId).toBe(second);
  });
});

it("classifies course progress using activity and full completion", () => {
  expect(courseProgressStatus(null)).toBeNull();
  expect(courseProgressStatus(summarizeCourse([first, second], []))).toBe("not-started");
  expect(courseProgressStatus(summarizeCourse([first, second], [watching(first, 1)]))).toBe(
    "in-progress",
  );
  expect(courseProgressStatus(summarizeCourse([first, second], [complete(first, 1)]))).toBe(
    "in-progress",
  );
  expect(
    courseProgressStatus(
      summarizeCourse([first, second], [complete(first, 1), complete(second, 2)]),
    ),
  ).toBe("completed");
  expect(
    courseProgressStatus(
      summarizeCourse(
        [first, second],
        [updateProgress(watching(first, 1), first, { type: "reset" }, 2)],
      ),
    ),
  ).toBe("not-started");
});
