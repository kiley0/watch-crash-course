import localforage from "localforage";
import { createProgressStore } from "./progress-store";

const database = localforage.createInstance({
  name: "crash-course-university",
  storeName: "video_progress",
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
});
export const progressStore = createProgressStore(database);
