import { createBrowserStore } from "../../site/infrastructure/browser-storage";
import { createQuizStore } from "./quiz-store";

export const quizStore = createQuizStore(createBrowserStore("quiz_attempts"));
