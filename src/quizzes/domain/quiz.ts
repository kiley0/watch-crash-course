export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  seconds: number;
}
export interface Quiz {
  videoId: string;
  revision: number;
  questions: QuizQuestion[];
}
export interface QuizAttempt {
  version: 1;
  videoId: string;
  revision: number;
  answers: Record<string, string>;
  attemptCount: number;
  bestScore: number;
  updatedAt: number;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid quiz data.");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2000)
    throw new Error("Invalid quiz text.");
  return value;
}
function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error("Invalid quiz number.");
  return value;
}
export function parseQuiz(value: unknown, videoId: string): Quiz {
  const data = object(value);
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || data.videoId !== videoId)
    throw new Error("Wrong quiz video.");
  if (!Array.isArray(data.questions) || data.questions.length < 1 || data.questions.length > 20)
    throw new Error("Invalid questions.");
  const ids = new Set<string>();
  const questions = data.questions.map((item: unknown): QuizQuestion => {
    const q = object(item);
    const id = text(q.id);
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id))
      throw new Error("Duplicate or invalid question ID.");
    ids.add(id);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6)
      throw new Error("Invalid options.");
    const optionIds = new Set<string>();
    const options = q.options.map((item: unknown) => {
      const option = object(item);
      const optionId = text(option.id);
      if (!/^[a-z0-9-]+$/.test(optionId) || optionIds.has(optionId))
        throw new Error("Duplicate or invalid option ID.");
      optionIds.add(optionId);
      return { id: optionId, text: text(option.text) };
    });
    const correctId = text(q.correctId);
    if (!optionIds.has(correctId)) throw new Error("Missing correct option.");
    return {
      id,
      prompt: text(q.prompt),
      options,
      correctId,
      explanation: text(q.explanation),
      seconds: integer(q.seconds, 0, 86400),
    };
  });
  return { videoId, revision: integer(data.revision, 1), questions };
}
export function scoreQuiz(quiz: Quiz, answers: Record<string, string>): number {
  return quiz.questions.filter((q) => answers[q.id] === q.correctId).length;
}
export function parseAttempt(value: unknown, quiz: Quiz): QuizAttempt | null {
  if (value === null || value === undefined) return null;
  const data = object(value);
  if (data.version !== 1 || data.videoId !== quiz.videoId)
    throw new Error("Unsupported quiz record.");
  integer(data.revision, 1);
  // Older revisions stay in storage, but their answers do not apply to new questions.
  if (data.revision !== quiz.revision) return null;
  const answers = object(data.answers);
  const clean: Record<string, string> = {};
  for (const [id, answer] of Object.entries(answers)) {
    const question = quiz.questions.find((q) => q.id === id);
    if (!question || !question.options.some((option) => option.id === answer))
      throw new Error("Invalid saved answer.");
    clean[id] = answer as string;
  }
  const bestScore = integer(data.bestScore, 0, quiz.questions.length);
  if (bestScore < scoreQuiz(quiz, clean)) throw new Error("Inconsistent best score.");
  return {
    version: 1,
    videoId: quiz.videoId,
    revision: quiz.revision,
    answers: clean,
    attemptCount: integer(data.attemptCount, 1),
    bestScore,
    updatedAt: integer(data.updatedAt, 0),
  };
}
export function answerQuestion(
  quiz: Quiz,
  previous: QuizAttempt | null,
  questionId: string,
  optionId: string,
  now: number,
): QuizAttempt {
  const q = quiz.questions.find((item) => item.id === questionId);
  if (!q?.options.some((option) => option.id === optionId)) throw new Error("Unknown answer.");
  if (previous && Object.hasOwn(previous.answers, questionId)) return previous;
  const answers = { ...previous?.answers, [questionId]: optionId };
  return {
    version: 1,
    videoId: quiz.videoId,
    revision: quiz.revision,
    answers,
    attemptCount: previous?.attemptCount ?? 1,
    bestScore: Math.max(previous?.bestScore ?? 0, scoreQuiz(quiz, answers)),
    updatedAt: now,
  };
}
export function retryQuiz(quiz: Quiz, previous: QuizAttempt, now: number): QuizAttempt {
  return {
    ...previous,
    answers: {},
    attemptCount: previous.attemptCount + 1,
    bestScore: Math.max(previous.bestScore, scoreQuiz(quiz, previous.answers)),
    updatedAt: now,
  };
}
