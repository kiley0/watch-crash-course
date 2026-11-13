import { readPlaybackSpeed, savePlaybackSpeed } from "./playback-speed";
import { playerHost } from "../domain/player-mode";
import type { PlayerMode } from "../domain/player-mode";

interface YouTubePlayer {
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  getCurrentTime(): number;
  getDuration(): number;
  getVideoUrl(): string;
  cueVideoById(options: { videoId: string; startSeconds: number }): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  pauseVideo(): void;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host: string;
      playerVars: { origin: string; playsinline: number; autoplay: number };
      events: {
        onReady(event: { target: YouTubePlayer }): void;
        onStateChange(event: { data: number }): void;
        onPlaybackRateChange(event: { data: number }): void;
        onError(event: { data: number }): void;
      };
    },
  ) => YouTubePlayer;
}
type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YouTubeApi> | undefined;
function loadApi(): Promise<YouTubeApi> {
  const youtube = window as YouTubeWindow;
  if (youtube.YT?.Player) return Promise.resolve(youtube.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timeout);
      script.remove();
      youtube.onYouTubeIframeAPIReady = undefined;
      apiPromise = undefined;
      reject(new Error("YouTube could not load. You can still open the original video below."));
    }
    youtube.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (youtube.YT?.Player) resolve(youtube.YT);
      else fail();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return apiPromise;
}
export interface PlaybackSample {
  position: number;
  duration: number;
  ended: boolean;
}
export interface PlayerSession {
  start(seconds: number): Promise<void>;
  startOver(): void;
  save(): void;
  destroy(): void;
}
export function createYouTubePlayer(
  container: HTMLElement,
  videoId: string,
  onSample: (sample: PlaybackSample) => void,
  onStatus: (message: string) => void,
  onError: (message: string) => void,
  onPlay: () => void = () => {},
  onPlayingChange: (playing: boolean) => void = () => {},
  mode: PlayerMode = "privacy-enhanced",
): PlayerSession {
  let player: YouTubePlayer | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let readyTimer: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  let ready = false;
  let disposed = false;
  let startAt = 0;
  const preferredSpeed = readPlaybackSpeed();
  let speedRestored = false;
  const isCurrentVideo = () => {
    try {
      return new URL(player?.getVideoUrl() ?? "").searchParams.get("v") === videoId;
    } catch {
      return false;
    }
  };
  const save = (ended = false) => {
    if (!disposed && player && ready && active && isCurrentVideo())
      onSample({ position: player.getCurrentTime(), duration: player.getDuration(), ended });
  };
  function stopTimer() {
    clearInterval(timer);
    timer = undefined;
  }
  return {
    async start(seconds) {
      startAt = seconds;
      const api = await loadApi();
      if (disposed) return;
      const target = document.createElement("div");
      container.replaceChildren(target);
      readyTimer = setTimeout(
        () => onError("The player isn’t responding. Try the original video on YouTube below."),
        20000,
      );
      player = new api.Player(target, {
        videoId,
        host: playerHost(mode),
        playerVars: { origin: window.location.origin, playsinline: 1, autoplay: 0 },
        events: {
          onReady(event) {
            if (disposed) return;
            clearTimeout(readyTimer);
            ready = true;
            event.target.cueVideoById({ videoId, startSeconds: startAt });
            onStatus("Ready when you are. Press play in the video.");
          },
          onStateChange(event) {
            if (disposed || !ready) return;
            if (!speedRestored && isCurrentVideo() && (event.data === 5 || event.data === 1)) {
              const rates = player!.getAvailablePlaybackRates();
              // Rates can be unavailable at cue time; retry when playback starts.
              if (rates.length) {
                speedRestored = true;
                if (rates.includes(preferredSpeed)) player!.setPlaybackRate(preferredSpeed);
              }
            }
            stopTimer();
            if (event.data === 1 || event.data === 3) onPlayingChange(true);
            if (event.data === 1) {
              if (!isCurrentVideo()) {
                active = false;
                onError(
                  "The player switched to a different video. Reload this lesson to keep tracking it here.",
                );
                return;
              }
              active = true;
              onPlay();
              onStatus("Playing · your place is saved every few seconds.");
              timer = setInterval(() => save(), 5000);
            } else if (event.data === 0 || event.data === 2) {
              save(event.data === 0);
              onStatus(
                event.data === 0
                  ? "Nice work. That’s one more idea to carry."
                  : "Paused · a good place to pick up later.",
              );
              active = false;
              onPlayingChange(false);
            }
          },
          onPlaybackRateChange(event) {
            if (!disposed && ready && speedRestored && isCurrentVideo())
              savePlaybackSpeed(event.data);
          },
          onError(event) {
            if (disposed) return;
            stopTimer();
            clearTimeout(readyTimer);
            active = false;
            onPlayingChange(false);
            onError(
              event.data === 101 || event.data === 150
                ? "This video doesn’t allow embedded playback. Open it on YouTube below."
                : "YouTube couldn’t play this video here. It may be unavailable or blocked. Try the original video below.",
            );
          },
        },
      });
    },
    startOver() {
      startAt = 0;
      active = false;
      onPlayingChange(false);
      stopTimer();
      if (ready && player) {
        player.pauseVideo();
        player.seekTo(0, true);
      }
    },
    save() {
      save();
    },
    destroy() {
      if (disposed) return;
      save();
      disposed = true;
      active = false;
      onPlayingChange(false);
      stopTimer();
      clearTimeout(readyTimer);
      player?.destroy();
    },
  };
}
