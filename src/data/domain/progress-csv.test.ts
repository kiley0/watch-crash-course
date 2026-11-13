import { expect, it } from "vite-plus/test";
import { progressCsv } from "./progress-csv";
import type { Backup } from "./backup";
import { updateProgress } from "../../learning/domain/progress";
const videoId = "E7CwqNHn_Ns";
const backup: Backup = {
  format: "watch-crash-course",
  version: 1,
  exportedAt: 1000,
  videos: [updateProgress(null, videoId, { type: "playback", position: 30, duration: 120 }, 0)],
};

it("exports saved positions, completion, UTC dates and catalog names without modifying the backup", () => {
  const original = structuredClone(backup);
  const csv = progressCsv(
    backup,
    new Map([
      [
        videoId,
        { collection: "Crash Course", course: "Study Skills", number: 1, title: "Taking Notes" },
      ],
    ]),
  );
  expect(csv).toContain('"Crash Course","Study Skills","1","Taking Notes","E7CwqNHn_Ns"');
  expect(csv).toContain('"In progress","30","120","25","false","","1970-01-01T00:00:00.000Z"');
  expect(backup).toEqual(original);
});

it("preserves commas, quotes, multiline text and international titles", () => {
  const csv = progressCsv(
    backup,
    new Map([
      [
        videoId,
        {
          collection: "Crash Course",
          course: 'Biología, "vida"',
          number: 1,
          title: "Water\nand pH",
        },
      ],
    ]),
  );
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"Biología, ""vida""","1","Water\nand pH"');
  expect(csv.endsWith("\r\n")).toBe(true);
});

it("keeps formula-like text safe for spreadsheet applications", () => {
  for (const title of ["=1+1", "+1+1", "-1+1", "@SUM(A1)", "  =1+1", "\t=1+1"]) {
    expect(
      progressCsv(
        backup,
        new Map([[videoId, { collection: "Crash Course", course: "Course", number: 1, title }]]),
      ),
    ).toContain(`"'${title}"`);
  }
});

it("retains unknown videos and exports completion with unknown duration", () => {
  const csv = progressCsv({
    ...backup,
    videos: [updateProgress(null, videoId, { type: "complete" }, 0)],
  });
  expect(csv).toContain('"","","","","E7CwqNHn_Ns","https://www.youtube.com/watch?v=E7CwqNHn_Ns"');
  expect(csv).toContain('"Completed","0","0","100","true","manual"');
});

it("exports a valid header-only CSV when no progress is saved", () => {
  const csv = progressCsv({ ...backup, videos: [] });
  expect(csv.split("\r\n")).toHaveLength(2);
  expect(csv).toContain('"video_id"');
});
