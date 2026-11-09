import { afterEach, expect, it, vi } from "vite-plus/test";
import { createWatchingMode } from "./watching-mode";
function setup() {
  vi.useFakeTimers();
  const classes = new Set<string>();
  const body = {
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
    },
  };
  const motion = Object.assign(new EventTarget(), { matches: false });
  const frame = {};
  const doc = Object.assign(new EventTarget(), {
    body,
    documentElement: {},
    activeElement: body as object,
    hidden: false,
  });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { matchMedia: () => motion });
  const player = { contains: (el: object) => el === frame } as unknown as HTMLElement;
  return { controller: createWatchingMode(player), classes, doc, motion, frame };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("dims only after playback and restores on pause/end", () => {
  const view = setup();
  vi.advanceTimersByTime(10000);
  expect(view.classes.has("is-watching")).toBe(false);
  view.controller.setPlaying(true);
  vi.advanceTimersByTime(1999);
  expect(view.classes.has("is-watching")).toBe(false);
  vi.advanceTimersByTime(1);
  expect(view.classes.has("is-watching")).toBe(true);
  view.controller.setPlaying(false);
  expect(view.classes.has("is-watching")).toBe(false);
  view.controller.destroy();
});
it.each(["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"])(
  "restores on %s and waits three quiet seconds",
  (event) => {
    const view = setup();
    view.controller.setPlaying(true);
    vi.advanceTimersByTime(2000);
    view.doc.dispatchEvent(new Event(event));
    expect(view.classes.has("is-watching")).toBe(false);
    vi.advanceTimersByTime(2999);
    expect(view.classes.has("is-watching")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(view.classes.has("is-watching")).toBe(true);
    view.controller.destroy();
  },
);
it("keeps controls visible while focus is outside the player", () => {
  const view = setup();
  view.doc.activeElement = {};
  view.controller.setPlaying(true);
  vi.advanceTimersByTime(10000);
  expect(view.classes.has("is-watching")).toBe(false);
  view.doc.activeElement = view.frame;
  view.doc.dispatchEvent(new Event("focusin"));
  vi.advanceTimersByTime(3000);
  expect(view.classes.has("is-watching")).toBe(true);
  view.doc.activeElement = {};
  view.doc.dispatchEvent(new Event("focusin"));
  expect(view.classes.has("is-watching")).toBe(false);
  view.controller.destroy();
});
it("restores for reduced motion and background tabs", () => {
  const view = setup();
  view.controller.setPlaying(true);
  vi.advanceTimersByTime(2000);
  view.motion.matches = true;
  view.motion.dispatchEvent(new Event("change"));
  expect(view.classes.has("is-watching")).toBe(false);
  vi.advanceTimersByTime(10000);
  expect(view.classes.has("is-watching")).toBe(false);
  view.motion.matches = false;
  view.motion.dispatchEvent(new Event("change"));
  view.doc.hidden = true;
  view.doc.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(10000);
  expect(view.classes.has("is-watching")).toBe(false);
  view.doc.hidden = false;
  view.doc.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(3000);
  expect(view.classes.has("is-watching")).toBe(true);
  view.controller.destroy();
});
it("does not restart the timer on repeated playing notifications and cleans up", () => {
  const view = setup();
  view.controller.setPlaying(true);
  vi.advanceTimersByTime(1500);
  view.controller.setPlaying(true);
  vi.advanceTimersByTime(500);
  expect(view.classes.has("is-watching")).toBe(true);
  view.controller.destroy();
  view.controller.setPlaying(true);
  view.doc.dispatchEvent(new Event("pointermove"));
  vi.advanceTimersByTime(10000);
  expect(view.classes.has("is-watching")).toBe(false);
});
