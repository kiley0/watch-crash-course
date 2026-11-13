import { afterEach, expect, it, vi } from "vite-plus/test";
import { animateBookTurn } from "./book-turn";

function turnFixture() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  const finished = { promise, resolve, reject };
  const animation = {
    finished: finished.promise,
    cancel: vi.fn(() => finished.reject(new Error("cancelled"))),
  };
  const leaf = {
    className: "",
    setAttribute: vi.fn(),
    inert: false,
    append: vi.fn(),
    animate: vi.fn(() => animation),
    remove: vi.fn(),
  };
  vi.stubGlobal("document", { createElement: () => leaf });
  const append = vi.fn();
  const stationaryRemove = vi.fn();
  const book = { append } as unknown as HTMLElement;
  const face = () => ({ classList: { add: vi.fn() }, remove: vi.fn() }) as unknown as HTMLElement;
  return {
    finished,
    animation,
    leaf,
    book,
    append,
    stationaryRemove,
    front: face(),
    back: face(),
    stationary: { classList: { add: vi.fn() }, remove: stationaryRemove } as unknown as HTMLElement,
  };
}
afterEach(() => vi.unstubAllGlobals());

it("removes both animation layers after completing a page turn", async () => {
  const f = turnFixture();
  const turn = animateBookTurn(
    f.book,
    f.front,
    f.back,
    f.stationary,
    true,
    new AbortController().signal,
  );
  expect(f.append).toHaveBeenCalledTimes(2);
  f.finished.resolve();
  await turn;
  expect(f.leaf.remove).toHaveBeenCalledOnce();
  expect(f.stationaryRemove).toHaveBeenCalledOnce();
});

it("cancels and cleans up when progress refresh or destruction interrupts a turn", async () => {
  const f = turnFixture();
  const controller = new AbortController();
  const turn = animateBookTurn(f.book, f.front, f.back, f.stationary, false, controller.signal);
  controller.abort();
  await turn;
  expect(f.animation.cancel).toHaveBeenCalledOnce();
  expect(f.leaf.remove).toHaveBeenCalledOnce();
  expect(f.stationaryRemove).toHaveBeenCalledOnce();
});

it("leaves no overlay if the browser cannot create the animation", async () => {
  const f = turnFixture();
  f.leaf.animate.mockImplementation(() => {
    throw new Error("animation unavailable");
  });
  await animateBookTurn(f.book, f.front, f.back, f.stationary, true, new AbortController().signal);
  expect(f.leaf.remove).toHaveBeenCalledOnce();
  expect(f.stationaryRemove).toHaveBeenCalledOnce();
});
