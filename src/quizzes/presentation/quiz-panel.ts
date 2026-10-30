import Alpine from "@alpinejs/csp";
import { loadQuiz } from "../infrastructure/static-quizzes";
import { quizStore } from "../infrastructure/browser-quizzes";
import { scoreQuiz } from "../domain/quiz";
import type { Quiz, QuizAttempt } from "../domain/quiz";
import { quizQuestions } from "./quiz-questions";
import type { QuestionView } from "./quiz-questions";
import "./quiz.css";
Alpine.data("quizPanel", () => ({
  quiz: null as Quiz | null,
  attempt: null as QuizAttempt | null,
  loading: true,
  error: "",
  warning: "",
  busy: false,
  get intro(): string {
    const count = this.quiz?.questions.length;
    const opening = count
      ? `${count} optional ${count === 1 ? "question" : "questions"}.`
      : "Optional review questions.";
    return `${opening} No timer, no grades. These fan-made questions are a chance to practice, and won’t change your episode completion.`;
  },
  get available(): boolean {
    return !this.loading && !this.error && !!this.quiz;
  },
  get missing(): boolean {
    return !this.loading && !this.error && !this.quiz;
  },
  get roundComplete(): boolean {
    return (
      !!this.quiz && Object.keys(this.attempt?.answers ?? {}).length === this.quiz.questions.length
    );
  },
  get hasAnswers(): boolean {
    return !!Object.keys(this.attempt?.answers ?? {}).length;
  },
  get summary(): string {
    if (!this.quiz) return "";
    const answered = Object.keys(this.attempt?.answers ?? {}).length;
    const total = this.quiz.questions.length;
    return `${answered} of ${total} answered · ${scoreQuiz(this.quiz, this.attempt?.answers ?? {})} correct`;
  },
  get bestLabel(): string {
    return this.attempt && this.quiz
      ? `Attempt ${this.attempt.attemptCount} · Best so far: ${this.attempt.bestScore} of ${this.quiz.questions.length}`
      : "";
  },
  get saveLabel(): string {
    return this.warning
      ? "Answers are temporary in this tab."
      : "Answers saved in this browser. Watch progress stays separate.";
  },
  get questions(): QuestionView[] {
    if (!this.quiz) return [];
    return quizQuestions(this.quiz, this.attempt);
  },
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    this.error = "";
    try {
      const id = new URLSearchParams(window.location.search).get("video") ?? "";
      this.quiz = await loadQuiz(id);
      if (this.quiz) this.attempt = await quizStore.load(this.quiz);
      this.warning = quizStore.warning;
    } catch {
      this.error =
        "The questions couldn’t load. You can keep watching and try again when you’re ready.";
    } finally {
      this.loading = false;
    }
  },
  async choose(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const question = button.dataset.question;
    const option = button.dataset.option;
    if (!this.quiz || this.busy || !question || !option) return;
    this.busy = true;
    try {
      this.attempt = await quizStore.answer(this.quiz, question, option);
      this.warning = quizStore.warning;
      void Alpine.nextTick(() =>
        requestAnimationFrame(() => document.getElementById(`quiz-feedback-${question}`)?.focus()),
      );
    } finally {
      this.busy = false;
    }
  },
  async retry() {
    if (!this.quiz || this.busy) return;
    this.busy = true;
    try {
      this.attempt = await quizStore.retry(this.quiz);
      this.warning = quizStore.warning;
      void Alpine.nextTick(() =>
        requestAnimationFrame(() => document.getElementById("quiz-heading")?.focus()),
      );
    } finally {
      this.busy = false;
    }
  },
}));
