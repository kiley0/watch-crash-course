import { afterEach, expect, it, vi } from "vite-plus/test";
import { fitHeroDescriptions } from "./hero-descriptions";

afterEach(() => vi.unstubAllGlobals());
function fixture(expandedHeight: number, wide = true) {
  const classes = new Set<string>();
  const entries = {
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      toggle: (name: string, enabled: boolean) =>
        enabled ? classes.add(name) : classes.delete(name),
    },
    getBoundingClientRect: () => ({ top: 100, height: classes.size ? expandedHeight : 200 }),
  };
  const book = {
    querySelector: (selector: string) =>
      selector === ".notebook-intro"
        ? {}
        : selector === ".notebook-episode-entries"
          ? entries
          : { getBoundingClientRect: () => ({ top: 424 }) },
  } as unknown as HTMLElement;
  const disconnect = vi.fn();
  const media = { matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const callbacks: (() => void)[] = [];
  vi.stubGlobal("window", { matchMedia: () => media });
  vi.stubGlobal("getComputedStyle", () => ({ marginBlockEnd: "24px" }));
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callbacks.push(callback);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  let changed!: () => void;
  class Observer {
    constructor(callback: () => void) {
      changed = callback;
    }
    observe = vi.fn();
    disconnect = disconnect;
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("MutationObserver", Observer);
  return { book, classes, media, callbacks, changed: () => changed(), disconnect };
}

it("shows both extra descriptions only when the expanded grid fits the facing page", () => {
  const fit = fixture(300);
  const stop = fitHeroDescriptions(fit.book);
  expect(fit.classes.has("show-extra-descriptions")).toBe(true);
  stop();
  const tight = fixture(301);
  fitHeroDescriptions(tight.book)();
  expect(tight.classes.size).toBe(0);
});
it("rechecks changed content and layout once per frame and cleans up observers", () => {
  const view = fixture(280, false);
  const stop = fitHeroDescriptions(view.book);
  expect(view.classes.size).toBe(0);
  view.media.matches = true;
  view.changed();
  view.changed();
  expect(view.callbacks).toHaveLength(1);
  view.callbacks[0]!();
  expect(view.classes.has("show-extra-descriptions")).toBe(true);
  stop();
  expect(view.disconnect).toHaveBeenCalledTimes(2);
  expect(view.media.removeEventListener).toHaveBeenCalledOnce();
});
