import { afterEach, expect, it, vi } from "vite-plus/test";
import { updateProgress } from "../../learning/domain/progress";

const mocks = vi.hoisted(() => ({
  factory: undefined as undefined | (() => any),
  restore: undefined as undefined | (() => Promise<void>),
  refresh: vi.fn(),
  update: vi.fn(),
  mode: vi.fn(() => "privacy-enhanced"),
  player: vi.fn(),
  watching: vi.fn(),
}));
vi.mock("@alpinejs/csp", () => ({
  default: {
    data: (_name: string, factory: () => any) => {
      mocks.factory = factory;
    },
    start: vi.fn(),
    nextTick: async (callback?: () => void) => callback?.(),
  },
}));
vi.mock("../../site/reload-on-restore", () => ({
  refreshOnRestore: (restore: () => Promise<void>) => {
    mocks.restore = restore;
    return vi.fn();
  },
}));
vi.mock("../../learning/infrastructure/browser-progress", () => ({
  progressStore: { refresh: mocks.refresh, update: mocks.update, warning: "" },
}));
vi.mock("../infrastructure/player-preference", () => ({ readPlayerMode: mocks.mode }));
vi.mock("../infrastructure/youtube-player", () => ({ createYouTubePlayer: mocks.player }));
vi.mock("./watching-mode", () => ({ createWatchingMode: mocks.watching }));
vi.mock("../../site/presentation/idle-bean", () => ({ setIdleBeanPlayback: vi.fn() }));
vi.mock("../../site/infrastructure/analytics", () => ({ trackVideoPlay: vi.fn() }));
import "./watch-page";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("recreates the disposed player on history restore using fresh progress and the visit's player preference", async () => {
  const win = new EventTarget();
  const doc = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", Object.assign(doc, { querySelector: () => ({}) }));
  const sessions: { destroy: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }[] = [];
  mocks.player.mockImplementation(() => {
    const session = { destroy: vi.fn(), start: vi.fn(async () => {}) };
    sessions.push(session);
    return session;
  });
  mocks.watching.mockImplementation(() => ({ destroy: vi.fn(), setPlaying: vi.fn() }));
  const page = mocks.factory!();
  page.load = vi.fn(async () => {});
  page.loading = false;
  page.course = { id: "biology" };
  page.episode = { videoId: "E7CwqNHn_Ns" };
  await page.init();
  await page.startPlayer(0);
  win.dispatchEvent(new Event("pagehide"));
  expect(sessions[0]!.destroy).toHaveBeenCalledOnce();
  const progress = { videoId: "E7CwqNHn_Ns", position: 42, duration: 100, completed: false };
  mocks.refresh.mockResolvedValue([progress]);
  await mocks.restore!();
  expect(page.progress).toEqual(progress);
  expect(sessions[1]!.start).toHaveBeenCalledWith(42);
  expect(mocks.mode).toHaveBeenCalledOnce();
  expect(mocks.player.mock.calls[1]![7]).toBe("privacy-enhanced");
  page.destroy();
});

function completionFixture() {
  const focus = vi.fn();
  const container = {};
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", {
    removeEventListener: vi.fn(),
    querySelector: () => container,
    getElementById: () => ({ focus }),
  });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
  mocks.player.mockImplementation(() => ({
    start: vi.fn(async () => {}),
    destroy: vi.fn(),
    save: vi.fn(),
  }));
  const page = mocks.factory!();
  page.course = { id: "biology", title: "Biology" };
  page.episode = { videoId: "E7CwqNHn_Ns", title: "Introduction" };
  page.nextUrl = "./watch.html?course=biology&video=WAIUkjsZ5xQ";
  page.nextTitle = "The next lesson";
  mocks.update.mockImplementation(async (id, event) =>
    updateProgress(page.progress, id, event, 100),
  );
  return { page, focus };
}

it("shows the end screen only on an ended playback sample and saves completion", async () => {
  const { page, focus } = completionFixture();
  await page.startPlayer(0);
  const sample = mocks.player.mock.calls.at(-1)![2];
  sample({ position: 10, duration: 100, ended: false });
  await vi.waitFor(() => expect(page.progress?.position).toBe(10));
  expect(page.showCompletionOverlay).toBe(false);
  sample({ position: 100, duration: 100, ended: true });
  await vi.waitFor(() => expect(page.isCompleted).toBe(true));
  expect(page.showCompletionOverlay).toBe(true);
  expect(page.hasNext).toBe(true);
  expect(focus).toHaveBeenCalled();
  page.dismissCompletion();
  expect(page.showCompletionOverlay).toBe(false);
});

it("restarts at zero without clearing saved completion and can show the end screen again", async () => {
  const { page } = completionFixture();
  await page.startPlayer(0);
  mocks.player.mock.calls.at(-1)![2]({ position: 100, duration: 100, ended: true });
  await vi.waitFor(() => expect(page.isCompleted).toBe(true));
  await page.restartEpisode();
  expect(page.showCompletionOverlay).toBe(false);
  expect(page.isCompleted).toBe(true);
  expect(mocks.player.mock.results.at(-1)!.value.start).toHaveBeenCalledWith(0);
  mocks.player.mock.calls.at(-1)![2]({ position: 100, duration: 100, ended: true });
  await vi.waitFor(() => expect(page.showCompletionOverlay).toBe(true));
});

it("does not interrupt manual completion, saved completion, or playback after leaving", async () => {
  const { page } = completionFixture();
  await page.markComplete();
  expect(page.showCompletionOverlay).toBe(false);
  await page.startPlayer(0);
  expect(page.showCompletionOverlay).toBe(false);
  page.nextUrl = "";
  expect(page.isLastEpisode).toBe(true);
  expect(page.completionMessage).toContain("last episode");
  page.destroy();
  mocks.player.mock.calls.at(-1)![2]({ position: 100, duration: 100, ended: true });
  expect(page.showCompletionOverlay).toBe(false);
});

it("keeps the player's final progress sample on pagehide without opening the overlay", async () => {
  const { page } = completionFixture();
  const doc = new EventTarget();
  Object.assign(doc, { querySelector: () => ({}), getElementById: () => ({ focus: vi.fn() }) });
  vi.stubGlobal("document", doc);
  page.load = vi.fn(async () => {});
  page.loading = false;
  await page.init();
  await page.startPlayer(0);
  const sample = mocks.player.mock.calls.at(-1)![2];
  mocks.player.mock.results.at(-1)!.value.destroy.mockImplementation(() => {
    sample({ position: 47, duration: 100, ended: false });
  });
  window.dispatchEvent(new Event("pagehide"));
  await vi.waitFor(() => expect(page.progress?.position).toBe(47));
  expect(page.showCompletionOverlay).toBe(false);
  page.destroy();
});

it("waits for fullscreen exit before focusing the end screen and does not steal focus after dismissal", async () => {
  const { page, focus } = completionFixture();
  let finishExit!: () => void;
  const exit = new Promise<void>((resolve) => {
    finishExit = resolve;
  });
  vi.stubGlobal("document", {
    fullscreenElement: {},
    querySelector: () => ({ contains: () => true }),
    exitFullscreen: vi.fn(() => exit),
    getElementById: (id: string) => ({ focus: () => focus(id) }),
  });
  const finishing = page.finishPlayback();
  expect(page.showCompletionOverlay).toBe(true);
  expect(focus).not.toHaveBeenCalled();
  finishExit();
  await finishing;
  expect(focus).toHaveBeenCalledWith("playback-finished-title");
  focus.mockClear();
  const dismissed = page.finishPlayback();
  page.dismissCompletion();
  await dismissed;
  expect(focus).toHaveBeenCalledWith("player-container");
  expect(focus).not.toHaveBeenCalledWith("playback-finished-title");
});

it("finishes saving before offering navigation and ignores an end save superseded by a replay", async () => {
  const { page } = completionFixture();
  await page.startPlayer(0);
  let save!: (record: ReturnType<typeof updateProgress>) => void;
  mocks.update.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        save = resolve;
      }),
  );
  const sample = mocks.player.mock.calls.at(-1)![2];
  sample({ position: 100, duration: 100, ended: true });
  expect(page.showCompletionOverlay).toBe(false);
  await page.restartEpisode();
  save(
    updateProgress(
      null,
      page.episode.videoId,
      { type: "playback", position: 100, duration: 100, ended: true },
      100,
    ),
  );
  await vi.waitFor(() => expect(page.isCompleted).toBe(true));
  expect(page.showCompletionOverlay).toBe(false);
});
