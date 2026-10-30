import localforage from "localforage";

export function createBrowserStore(storeName: string) {
  return localforage.createInstance({
    name: "watch-crash-course",
    storeName,
    driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
  });
}
