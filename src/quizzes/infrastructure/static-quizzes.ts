import { parseQuiz } from "../domain/quiz";
import type { Quiz } from "../domain/quiz";
export async function loadQuiz(videoId: string): Promise<Quiz | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("Invalid video ID.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(new URL(`./data/quizzes/${videoId}.json`, document.baseURI), {
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Quiz unavailable.");
    return parseQuiz(await response.json(), videoId);
  } finally {
    clearTimeout(timeout);
  }
}
