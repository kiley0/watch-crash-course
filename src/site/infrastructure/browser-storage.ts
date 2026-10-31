import localforage from "localforage";
import { createStorageCoordinator } from "./storage-coordinator";
import type { StoreName } from "./storage-coordinator";
function database(storeName: string) {
  return localforage.createInstance({
    name: "watch-crash-course",
    storeName,
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  });
}
export const browserStorage = createStorageCoordinator(
  {
    video_progress: database("video_progress"),
    quiz_attempts: database("quiz_attempts"),
  },
  database("data_settings"),
);
export function createBrowserStore(storeName: StoreName) {
  return browserStorage.store(storeName);
}
