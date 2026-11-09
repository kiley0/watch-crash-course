import { afterEach, expect, it, vi } from "vite-plus/test";
import { createIdleBean } from "./idle-bean";
function setup(reduced = false) {
  vi.useFakeTimers();
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const bean = {
    src: "",
    alt: "",
    className: "",
    draggable: true,
    setAttribute: vi.fn(),
    classList: { add: vi.fn() },
    remove: vi.fn(),
  };
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => bean,
    body: { append: vi.fn() },
  });
  const win = Object.assign(new EventTarget(), { matchMedia: () => motion });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
  return { controller: createIdleBean(), doc, win, bean, motion };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("peeks after 30 seconds, hides after four, and never repeats", () => {
  const view = setup();
  vi.advanceTimersByTime(29999);
  expect(view.doc.body.append).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  expect(view.bean.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
  vi.advanceTimersByTime(4000);
  expect(view.bean.remove).toHaveBeenCalled();
  view.doc.dispatchEvent(new Event("pointermove"));
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.controller.destroy();
});
it.each(["pointerdown", "pointermove", "keydown", "touchstart", "scroll", "wheel"])(
  "resets on %s activity",
  (event) => {
    const view = setup();
    vi.advanceTimersByTime(20000);
    view.doc.dispatchEvent(new Event(event));
    vi.advanceTimersByTime(29999);
    expect(view.doc.body.append).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(view.doc.body.append).toHaveBeenCalledTimes(1);
    view.controller.destroy();
  },
);
it("waits for a fresh idle interval after playback stops", () => {
  const view = setup();
  vi.advanceTimersByTime(20000);
  view.controller.setPlaying(true);
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).not.toHaveBeenCalled();
  view.controller.setPlaying(false);
  vi.advanceTimersByTime(29999);
  expect(view.doc.body.append).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.controller.destroy();
});
it("does not count time in background tabs", () => {
  const view = setup();
  vi.advanceTimersByTime(20000);
  view.doc.hidden = true;
  view.doc.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).not.toHaveBeenCalled();
  view.doc.hidden = false;
  view.doc.dispatchEvent(new Event("visibilitychange"));
  vi.advanceTimersByTime(30000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.controller.destroy();
});
it("respects reduced motion, including a preference change during the peek", () => {
  const view = setup(true);
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).not.toHaveBeenCalled();
  view.motion.matches = false;
  view.motion.dispatchEvent(new Event("change"));
  vi.advanceTimersByTime(30000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.motion.matches = true;
  view.motion.dispatchEvent(new Event("change"));
  expect(view.bean.remove).toHaveBeenCalled();
  view.controller.destroy();
});
it("cleans up and handles back-forward cache restoration without repeating", () => {
  const view = setup();
  vi.advanceTimersByTime(20000);
  view.win.dispatchEvent(new Event("pagehide"));
  // A player disposal callback may follow pagehide while document.hidden is still false.
  view.controller.setPlaying(false);
  view.doc.dispatchEvent(new Event("pointermove"));
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).not.toHaveBeenCalled();
  view.win.dispatchEvent(new Event("pageshow"));
  vi.advanceTimersByTime(30000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.controller.destroy();
  view.doc.dispatchEvent(new Event("scroll"));
  view.win.dispatchEvent(new Event("pageshow"));
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
});

it("does not repeat after a peek followed by back-forward restoration", () => {
  const view = setup();
  vi.advanceTimersByTime(30000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.win.dispatchEvent(new Event("pagehide"));
  view.win.dispatchEvent(new Event("pageshow"));
  vi.advanceTimersByTime(60000);
  expect(view.doc.body.append).toHaveBeenCalledTimes(1);
  view.controller.destroy();
});
