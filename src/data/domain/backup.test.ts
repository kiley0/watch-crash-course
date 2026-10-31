import { describe, expect, it } from "vite-plus/test";
import { MAX_BACKUP_BYTES, MAX_BACKUP_RECORDS, parseBackup, readBackup } from "./backup";
import { updateProgress } from "../../learning/domain/progress";
import { answerQuestion, parseQuiz } from "../../quizzes/domain/quiz";
import fixture from "../../../public/data/quizzes/E7CwqNHn_Ns.json";
const quiz = parseQuiz(fixture, fixture.videoId);
const video = updateProgress(null, quiz.videoId, { type: "complete" }, 1);
const attempt = answerQuestion(quiz, null, "meaning", "a", 1);
const backup = {
  format: "watch-crash-course",
  version: 1,
  exportedAt: 1,
  videos: [video],
  quizzes: [attempt],
};
describe("backup format", () => {
  it("round-trips records without a catalog or quiz fetch, including other quiz revisions", () => {
    const data = { ...backup, quizzes: [{ ...attempt, revision: 8 }] };
    expect(readBackup(JSON.stringify(data))).toEqual(data);
    expect(parseBackup({ ...backup, videos: [], quizzes: [] }).videos).toEqual([]);
  });
  it("rejects unsupported formats, fields, schemas, duplicate records and invalid numbers", () => {
    for (const value of [
      { ...backup, version: 2 },
      { ...backup, format: "other" },
      { ...backup, surprise: true },
      { ...backup, exportedAt: NaN },
      { ...backup, videos: [video, video] },
      { ...backup, quizzes: [attempt, attempt] },
      { ...backup, videos: [{ ...video, position: -1 }] },
      { ...backup, videos: [{ ...video, schemaVersion: 2 }] },
      { ...backup, videos: [{ ...video, extra: true }] },
      { ...backup, quizzes: [{ ...attempt, updatedAt: Infinity }] },
      { ...backup, quizzes: [{ ...attempt, answers: { meaning: "<script>" } }] },
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
