import { afterEach, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  factory: undefined as undefined | (() => any),
  restore: undefined as undefined | (() => Promise<void>),
  refresh: vi.fn(),
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
    nextTick: async () => {},
  },
}));
vi.mock("../../site/reload-on-restore", () => ({
  refreshOnRestore: (restore: () => Promise<void>) => {
    mocks.restore = restore;
    return vi.fn();
  },
}));
vi.mock("../../learning/infrastructure/browser-progress", () => ({
  progressStore: { refresh: mocks.refresh, warning: "" },
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
