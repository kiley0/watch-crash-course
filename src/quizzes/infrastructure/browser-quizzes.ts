import localforage from "localforage";
import { createQuizStore } from "./quiz-store";
export const quizStore = createQuizStore(
  localforage.createInstance({
    name: "crash-course-university",
    storeName: "quiz_attempts",
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  }),
);
