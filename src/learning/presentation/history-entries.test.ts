import { expect, it } from "vite-plus/test";
import { historyEntries } from "./history-entries";
import { updateProgress } from "../domain/progress";
const id = "E7CwqNHn_Ns";
it("drops stale course links when metadata disappears on a retry", () => {
  const record = updateProgress(null, id, { type: "playback", position: 25, duration: 100 }, 1);
  const metadata = new Map([
    [
      id,
      {
        title: "Taking Notes",
        context: "Study Skills",
        href: `./watch.html?course=study-skills&video=${id}`,
      },
    ],
  ]);
  const known = historyEntries([record], metadata)[0]!;
  expect(known.title).toBe("Taking Notes");
  expect(known.linkLabel).toBe("Resume at 0:25");
  expect(known.positionLabel).toBe("");
  const unavailable = historyEntries([record])[0]!;
  expect(unavailable.href).toBe(`https://www.youtube.com/watch?v=${id}`);
  expect(unavailable.linkLabel).toBe("Open on YouTube");
  expect(unavailable.title).toContain(id);
  expect(unavailable.position).toBe(25);
  expect(known.title).toBe("Taking Notes");
});
it("preserves latest-first activity and completion when only some metadata loads", () => {
  const first = updateProgress(null, id, { type: "complete" }, 1);
  const second = updateProgress(null, "WAIUkjsZ5xQ", { type: "complete" }, 2);
  const metadata = new Map([
    [id, { title: "Taking Notes", context: "Study Skills", href: "./watch.html" }],
  ]);
  const rows = historyEntries([first, second], metadata);
  expect(rows.map((row) => row.videoId)).toEqual([second.videoId, first.videoId]);
  expect(rows[0]?.linkLabel).toBe("Open on YouTube");
  expect(rows[1]?.linkLabel).toBe("Watch again");
  expect(rows[1]?.positionLabel).toBe("Marked complete by you");
  expect(rows[0]?.completed).toBe(true);
});

it("includes the complete episode history in latest-activity order", () => {
  const records = Array.from({ length: 50 }, (_, index) =>
    updateProgress(
      null,
      String(index).padStart(11, "0"),
      { type: "playback", position: 10, duration: 100 },
      index + 1,
    ),
  );
  const rows = historyEntries(records);
  expect(rows).toHaveLength(50);
  expect(rows.map((row) => row.videoId)).toEqual(
    records.toReversed().map((record) => record.videoId),
  );
});

it("matches the player's restart rule for an unfinished episode near its end", () => {
  const record = updateProgress(null, id, { type: "playback", position: 98, duration: 100 }, 1);
  const rows = historyEntries(
    [record],
    new Map([[id, { title: "Taking Notes", context: "Study Skills", href: "./watch.html" }]]),
  );
  expect(rows[0]?.linkLabel).toBe("Play episode");
  expect(rows[0]?.positionLabel).toBe("");
});
