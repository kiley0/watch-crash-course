import { answerQuestion, parseAttempt, retryQuiz } from "../domain/quiz";
import type { Quiz, QuizAttempt } from "../domain/quiz";
export interface QuizBackend {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: QuizAttempt): Promise<unknown>;
}
export function createQuizStore(backend: QuizBackend) {
  const memory = new Map<string, QuizAttempt | null>();
  let queue = Promise.resolve();
  let warning = "";
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  const key = (quiz: Quiz) => `quiz:${quiz.videoId}:r${quiz.revision}`;
  async function read(quiz: Quiz) {
    const id = key(quiz);
    if (memory.has(id)) return memory.get(id)!;
    let value: QuizAttempt | null = null;
    try {
      const stored = await backend.getItem(id);
      value = parseAttempt(stored, quiz);
      // A different revision belongs at a different key. Preserve mismatched data.
      if (stored !== null && stored !== undefined && !value)
        throw new Error("Quiz revision does not match its storage key.");
    } catch {
      warning =
        "Saved quiz answers couldn’t be read. Changes are temporary in this tab; existing data will not be overwritten.";
    }
    memory.set(id, value);
    return value;
  }
  async function write(quiz: Quiz, value: QuizAttempt) {
    memory.set(key(quiz), value);
    if (!warning) {
      try {
        await backend.setItem(key(quiz), value);
      } catch {
        warning = "Quiz answers can’t be saved in this browser. Changes are temporary in this tab.";
      }
    }
    return value;
  }
  return {
    get warning() {
      return warning;
    },
    load(quiz: Quiz) {
      return enqueue(() => read(quiz));
    },
    answer(quiz: Quiz, questionId: string, optionId: string) {
      return enqueue(async () =>
        write(quiz, answerQuestion(quiz, await read(quiz), questionId, optionId, Date.now())),
      );
    },
    retry(quiz: Quiz) {
      return enqueue(async () => {
        const previous = await read(quiz);
        return previous ? write(quiz, retryQuiz(quiz, previous, Date.now())) : null;
      });
    },
  };
}
