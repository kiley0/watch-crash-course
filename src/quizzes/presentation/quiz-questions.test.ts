import { describe, expect, it } from "vite-plus/test";
import fixture from "../../../public/data/quizzes/E7CwqNHn_Ns.json";
import { answerQuestion, parseQuiz } from "../domain/quiz";
import { quizQuestions } from "./quiz-questions";
const quiz = parseQuiz(fixture, fixture.videoId);
describe("quiz answer presentation", () => {
  it("does not mistake inherited object properties for saved answers", () => {
    const special = {
      ...quiz,
      questions: [{ ...quiz.questions[0]!, id: "constructor" }, quiz.questions[1]!],
    };
    const attempt = answerQuestion(special, null, "tools", "b", 1);
    const question = quizQuestions(special, attempt)[0]!;
    expect(question.answered).toBe(false);
    expect(question.options.every((option) => !option.selected && !option.label)).toBe(true);
  });
  it("identifies the chosen and correct answers with text and links to the same video", () => {
    const attempt = answerQuestion(quiz, null, "meaning", "b", 1);
    const question = quizQuestions(quiz, attempt)[0]!;
    expect(question.answered).toBe(true);
    expect(question.options.find((option) => option.id === "b")?.label).toBe("Your answer");
    expect(question.options.find((option) => option.id === "a")?.label).toBe("Correct answer");
    expect(question.feedback).toContain(quiz.questions[0]!.explanation);
    const url = new URL(question.reviewUrl);
    expect(url.searchParams.get("v")).toBe(quiz.videoId);
    expect(url.searchParams.get("t")).toBe("90s");
  });
});
