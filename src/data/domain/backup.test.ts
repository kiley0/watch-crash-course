import { describe, expect, it } from "vite-plus/test";
import { MAX_BACKUP_BYTES, MAX_BACKUP_RECORDS, parseBackup, readBackup } from "./backup";
import { updateProgress } from "../../learning/domain/progress";
const video = updateProgress(null, "E7CwqNHn_Ns", { type: "complete" }, 1);
const backup = {
  format: "watch-crash-course",
  version: 1,
  exportedAt: 1,
  videos: [video],
};
describe("backup format", () => {
  it("round-trips watch records without fetching catalog metadata", () => {
    expect(readBackup(JSON.stringify(backup))).toEqual(backup);
    expect(parseBackup({ ...backup, videos: [] }).videos).toEqual([]);
  });
  it("rejects unsupported formats, fields, schemas, duplicate records and invalid numbers", () => {
    for (const value of [
      { ...backup, version: 2 },
      { ...backup, format: "other" },
      { ...backup, surprise: true },
      { ...backup, exportedAt: NaN },
      { ...backup, videos: [video, video] },
      { ...backup, videos: [{ ...video, position: -1 }] },
      { ...backup, videos: [{ ...video, schemaVersion: 2 }] },
      { ...backup, videos: [{ ...video, extra: true }] },
    ])
      expect(() => parseBackup(value)).toThrow();
  });
  it("bounds file bytes and record counts before using data", () => {
    expect(() => readBackup("{broken")).toThrow("valid JSON");
    expect(() => readBackup("é".repeat(MAX_BACKUP_BYTES / 2 + 1))).toThrow("5 MB");
    expect(() =>
      parseBackup({ ...backup, videos: Array(MAX_BACKUP_RECORDS + 1).fill(video) }),
    ).toThrow("too many");
  });
});
