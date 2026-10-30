import type { Quiz, QuizAttempt, QuizQuestion } from "../domain/quiz";
import { timeLabel } from "../../learning/presentation/progress-labels";
export interface QuestionView extends QuizQuestion {
  answered: boolean;
  feedback: string;
  reviewUrl: string;
  reviewLabel: string;
  options: { id: string; text: string; selected: boolean; label: string }[];
}
export function quizQuestions(quiz: Quiz, attempt: QuizAttempt | null): QuestionView[] {
  return quiz.questions.map((q) => {
    const answer =
      attempt && Object.hasOwn(attempt.answers, q.id) ? attempt.answers[q.id] : undefined;
    const correct = q.options.find((option) => option.id === q.correctId)!;
    return {
      ...q,
      answered: !!answer,
      feedback:
        answer === q.correctId
          ? `That’s it! ${q.explanation}`
          : `A chance to learn: ${correct.text} ${q.explanation}`,
      reviewUrl: `https://www.youtube.com/watch?v=${quiz.videoId}&t=${q.seconds}s`,
      reviewLabel: q.seconds
        ? `Revisit at ${timeLabel(q.seconds)} on YouTube (new tab)`
        : "Revisit the video on YouTube (new tab)",
      options: q.options.map((option) => ({
        ...option,
        selected: answer === option.id,
        label: answer
          ? answer === option.id
            ? "Your answer"
            : option.id === q.correctId
              ? "Correct answer"
              : ""
          : "",
      })),
    };
  });
}
