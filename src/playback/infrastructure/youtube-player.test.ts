import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createYouTubePlayer } from "./youtube-player";
function playerFixture(mode?: "standard" | "privacy-enhanced") {
  let callbacks: {
    onReady: (event: { target: typeof player }) => void;
    onStateChange: (event: { data: number }) => void;
    onError: (event: { data: number }) => void;
  };
  const player = {
    getCurrentTime: vi.fn(() => 20),
    getDuration: vi.fn(() => 100),
    getVideoUrl: vi.fn(() => "https://www.youtube.com/watch?v=E7CwqNHn_Ns"),
    seekTo: vi.fn(),
    cueVideoById: vi.fn(),
    pauseVideo: vi.fn(),
    destroy: vi.fn(),
  };
  const constructor = vi.fn(function (
    _element: HTMLElement,
    options: { events: typeof callbacks },
  ) {
    callbacks = options.events;
    return player;
  });
  vi.stubGlobal("window", {
    location: { origin: "https://example.com" },
    YT: { Player: constructor },
  });
  vi.stubGlobal("document", { createElement: vi.fn(() => ({})) });
  const container = { replaceChildren: vi.fn() } as unknown as HTMLElement;
  const sample = vi.fn();
  const status = vi.fn();
  const error = vi.fn();
  const play = vi.fn();
  const playingChange = vi.fn();
  const session = createYouTubePlayer(
    container,
    "E7CwqNHn_Ns",
    sample,
    status,
    error,
    play,
    playingChange,
    mode,
  );
  return {
    session,
    play,
    playingChange,
    player,
    sample,
    error,
    constructor,
    ready: () => callbacks.onReady({ target: player }),
    state: (data: number) => callbacks.onStateChange({ data }),
    fail: (data: number) => callbacks.onError({ data }),
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("YouTube player lifecycle", () => {
  it("cues the saved position without seeking or sampling until playback starts", async () => {
    vi.useFakeTimers();
    const view = playerFixture();
    await view.session.start(42);
    expect(view.player.seekTo).not.toHaveBeenCalled();
    view.ready();
    expect(view.player.cueVideoById).toHaveBeenCalledWith({
      videoId: "E7CwqNHn_Ns",
      startSeconds: 42,
    });
    expect(view.player.seekTo).not.toHaveBeenCalled();
    view.state(5); // Cued is ready, but must never count as watched.
    await vi.advanceTimersByTimeAsync(5000);
    expect(view.sample).not.toHaveBeenCalled();
    view.state(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(view.sample).toHaveBeenLastCalledWith({ position: 20, duration: 100, ended: false });
    view.state(2);
    expect(view.sample).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10000);
    expect(view.sample).toHaveBeenCalledTimes(2);
    view.state(1);
    view.state(0);
    expect(view.sample).toHaveBeenLastCalledWith({ position: 20, duration: 100, ended: true });
    view.session.destroy();
    expect(vi.getTimerCount()).toBe(0);
    expect(view.player.destroy).toHaveBeenCalledOnce();
  });
  it("stops sampling before reset and retains standard controls with no autoplay", async () => {
    vi.useFakeTimers();
    const view = playerFixture();
    await view.session.start(0);
    view.ready();
    view.state(1);
    view.session.startOver();
    view.state(2);
    expect(view.sample).not.toHaveBeenCalled();
    expect(view.player.seekTo).toHaveBeenCalledWith(0, true);
    expect(view.player.pauseVideo).toHaveBeenCalledOnce();
    expect(view.constructor.mock.calls[0]?.[1]).toMatchObject({
      host: "https://www.youtube-nocookie.com",
      playerVars: { origin: "https://example.com", autoplay: 0 },
    });
    view.session.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels a pending resume when reset happens before the player is ready", async () => {
    vi.useFakeTimers();
    const view = playerFixture();
    await view.session.start(42);
    view.session.startOver();
    view.ready();
    expect(view.player.cueVideoById).toHaveBeenCalledWith({
      videoId: "E7CwqNHn_Ns",
      startSeconds: 0,
    });
    expect(view.player.seekTo).not.toHaveBeenCalled();
    view.session.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ignores late callbacks after leaving the page", async () => {
    vi.useFakeTimers();
    const view = playerFixture();
    await view.session.start(42);
    view.session.destroy();
    view.ready();
    view.state(1);
    view.fail(101);
    await vi.advanceTimersByTimeAsync(30000);
    expect(view.sample).not.toHaveBeenCalled();
    expect(view.error).not.toHaveBeenCalled();
    expect(view.player.seekTo).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not record another video selected in the YouTube player", async () => {
    vi.useFakeTimers();
    const view = playerFixture();
    await view.session.start(0);
    view.ready();
    view.player.getVideoUrl.mockReturnValue("https://www.youtube.com/watch?v=WAIUkjsZ5xQ");
    view.state(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(view.sample).not.toHaveBeenCalled();
    expect(view.error).toHaveBeenCalledWith(expect.stringContaining("different video"));
    view.session.destroy();
    view.session.destroy();
    expect(view.player.destroy).toHaveBeenCalledOnce();
  });
  it("reports unavailable embeds and readiness timeouts", async () => {
    vi.useFakeTimers();
    const view = playerFixture();
    await view.session.start(0);
    await vi.advanceTimersByTimeAsync(20000);
    expect(view.error).toHaveBeenLastCalledWith(expect.stringContaining("isn’t responding"));
    view.fail(101);
    expect(view.error).toHaveBeenLastCalledWith(expect.stringContaining("doesn’t allow embedded"));
    view.session.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("reports actual playback only after ready and for the expected video", async () => {
  vi.useFakeTimers();
  const view = playerFixture();
  await view.session.start(0);
  view.state(1);
  expect(view.play).not.toHaveBeenCalled();
  view.ready();
  view.state(5);
  view.state(2);
  expect(view.play).not.toHaveBeenCalled();
  view.state(1);
  expect(view.play).toHaveBeenCalledTimes(1);
  view.player.getVideoUrl.mockReturnValue("https://www.youtube.com/watch?v=other");
  view.state(1);
  expect(view.play).toHaveBeenCalledTimes(1);
  view.session.destroy();
});

it("keeps playback suppression through buffering and releases it on pause, end, error, reset and disposal", async () => {
  vi.useFakeTimers();
  const view = playerFixture();
  await view.session.start(0);
  view.ready();
  view.state(1);
  expect(view.playingChange).toHaveBeenLastCalledWith(true);
  view.state(3);
  expect(view.playingChange).toHaveBeenLastCalledWith(true);
  for (const state of [2, 0]) {
    view.state(1);
    view.state(state);
    expect(view.playingChange).toHaveBeenLastCalledWith(false);
  }
  view.state(1);
  view.fail(100);
  expect(view.playingChange).toHaveBeenLastCalledWith(false);
  view.state(1);
  view.session.startOver();
  expect(view.playingChange).toHaveBeenLastCalledWith(false);
  view.state(1);
  view.session.destroy();
  expect(view.playingChange).toHaveBeenLastCalledWith(false);
});

it("suppresses the bean during initial buffering without recording a play", async () => {
  vi.useFakeTimers();
  const view = playerFixture();
  await view.session.start(0);
  view.ready();
  view.state(3);
  expect(view.playingChange).toHaveBeenLastCalledWith(true);
  expect(view.play).not.toHaveBeenCalled();
  view.session.destroy();
});

it.each([
  [undefined, "https://www.youtube-nocookie.com"],
  ["privacy-enhanced", "https://www.youtube-nocookie.com"],
  ["standard", "https://www.youtube.com"],
] as const)(
  "creates the selected %s player without changing resume behavior",
  async (mode, host) => {
    vi.useFakeTimers();
    const view = playerFixture(mode);
    await view.session.start(42);
    expect(view.constructor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        host,
        playerVars: { origin: "https://example.com", playsinline: 1, autoplay: 0 },
      }),
    );
    view.ready();
    expect(view.player.cueVideoById).toHaveBeenCalledWith({
      videoId: "E7CwqNHn_Ns",
      startSeconds: 42,
    });
    view.state(1);
    vi.advanceTimersByTime(5000);
    expect(view.sample).toHaveBeenCalled();
    view.session.destroy();
  },
);
