import { afterEach, expect, it, vi } from "vite-plus/test";
import { reloadOnRestore } from "./reload-on-restore";
afterEach(() => vi.unstubAllGlobals());
it("refreshes only history-cache restores and removes its listener on cleanup", () => {
  const target = new EventTarget();
  const reload = vi.fn();
  vi.stubGlobal("window", Object.assign(target, { location: { reload } }));
  const stop = reloadOnRestore();
  target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
  expect(reload).not.toHaveBeenCalled();
  target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  expect(reload).toHaveBeenCalledOnce();
  stop();
  target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  expect(reload).toHaveBeenCalledOnce();
});
