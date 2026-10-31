import localforage from "localforage";
import { createStorageCoordinator } from "./storage-coordinator";
function database(storeName: string) {
  return localforage.createInstance({
    name: "watch-crash-course",
    storeName,
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  });
}
export const browserStorage = createStorageCoordinator(
  database("video_progress"),
  database("data_settings"),
);
export function createBrowserStore() {
  return browserStorage.store();
}
