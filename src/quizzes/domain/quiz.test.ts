import { describe, expect, it } from "vite-plus/test";
import fixture from "../../../public/data/quizzes/E7CwqNHn_Ns.json";
import course from "../../../public/data/courses/study-skills.json";
const fixtures = import.meta.glob("../../../public/data/quizzes/*.json", {
  eager: true,
  import: "default",
});
import { answerQuestion, parseAttempt, parseQuiz, retryQuiz, scoreQuiz } from "./quiz";
const videoId = "E7CwqNHn_Ns";
const quiz = parseQuiz(fixture, videoId);
describe("quiz rules and authored content", () => {
  it("ships three valid original questions for every pilot episode", () => {
    expect(Object.keys(fixtures)).toHaveLength(10);
    for (const episode of course.episodes) {
      const data = fixtures[`../../../public/data/quizzes/${episode.videoId}.json`];
      expect(parseQuiz(data, episode.videoId).questions).toHaveLength(3);
    }
  });
  it("rejects mismatched videos, duplicates, missing answers, and unsafe timestamps", () => {
    expect(() => parseQuiz(fixture, "WAIUkjsZ5xQ")).toThrow();
    for (const change of [
      { ...fixture, questions: [fixture.questions[0], fixture.questions[0]] },
      { ...fixture, questions: [{ ...fixture.questions[0], correctId: "missing" }] },
      { ...fixture, questions: [{ ...fixture.questions[0], seconds: -1 }] },
      {
        ...fixture,
        questions: [
          {
            ...fixture.questions[0],
            options: [fixture.questions[0].options[0], fixture.questions[0].options[0]],
          },
        ],
      },
    ])
      expect(() => parseQuiz(change, videoId)).toThrow();
  });
  it("locks the first answer until retry and scores only correct choices", () => {
    const wrong = answerQuestion(quiz, null, "meaning", "b", 1);
    expect(scoreQuiz(quiz, wrong.answers)).toBe(0);
    expect(answerQuestion(quiz, wrong, "meaning", "a", 2)).toBe(wrong);
    expect(() => answerQuestion(quiz, wrong, "meaning", "missing", 2)).toThrow();
  });
  it("allows object-property names as stable question IDs without phantom answers", () => {
    const special = parseQuiz(
      {
        ...fixture,
        questions: [{ ...fixture.questions[0], id: "constructor" }, fixture.questions[1]],
      },
      videoId,
    );
    const first = answerQuestion(special, null, "tools", "b", 1);
    const next = answerQuestion(special, first, "constructor", "a", 2);
    expect(scoreQuiz(special, next.answers)).toBe(2);
    expect(parseAttempt(next, special)?.answers.constructor).toBe("a");
  });
  it("preserves best score and counts retries without retaining answers", () => {
    const first = answerQuestion(quiz, null, "meaning", "a", 1);
    const second = answerQuestion(quiz, first, "tools", "b", 2);
    const fresh = retryQuiz(quiz, second, 3);
    expect(fresh.answers).toEqual({});
    expect(fresh.bestScore).toBe(2);
    expect(fresh.attemptCount).toBe(2);
    expect(answerQuestion(quiz, fresh, "meaning", "b", 4).bestScore).toBe(2);
  });
  it("restores validated attempts, ignores other revisions, and rejects corrupt answers", () => {
    const attempt = answerQuestion(quiz, null, "meaning", "a", 1);
    expect(parseAttempt(attempt, quiz)).toEqual(attempt);
    expect(parseAttempt(attempt, { ...quiz, revision: 2 })).toBeNull();
    expect(() => parseAttempt({ ...attempt, version: 2 }, quiz)).toThrow();
    expect(() => parseAttempt({ ...attempt, answers: { meaning: "missing" } }, quiz)).toThrow();
    expect(() => parseAttempt({ ...attempt, bestScore: 10 }, quiz)).toThrow();
    expect(() => parseAttempt({ ...attempt, bestScore: 0 }, quiz)).toThrow();
  });
});
