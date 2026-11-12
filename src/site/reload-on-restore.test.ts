import { afterEach, expect, it, vi } from "vite-plus/test";
import { refreshOnRestore, reloadOnRestore } from "./reload-on-restore";
afterEach(() => vi.unstubAllGlobals());
it("refreshes only history-cache restores and removes its listener on cleanup", () => {
  const target = new EventTarget();
  const refresh = vi.fn();
  vi.stubGlobal("window", target);
  const stop = refreshOnRestore(refresh);
  target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
  expect(refresh).not.toHaveBeenCalled();
  target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  expect(refresh).toHaveBeenCalledOnce();
  stop();
  target.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  expect(refresh).toHaveBeenCalledOnce();
});

it("reloads restored settings workflows and removes its listener on cleanup", () => {
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
