// Presentation only: no progress storage or player API calls.
export function createWatchingMode(player: HTMLElement) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = [
    "pointermove",
    "pointerdown",
    "touchstart",
    "wheel",
    "scroll",
    "keydown",
    "focusin",
    "focusout",
  ] as const;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let playing = false;
  let disposed = false;
  function restore() {
    document.body.classList.remove("is-watching");
  }
  function focusOutsidePlayer(): boolean {
    const focused = document.activeElement;
    return (
      !!focused &&
      focused !== document.body &&
      focused !== document.documentElement &&
      !player.contains(focused)
    );
  }
  function schedule(delay: number) {
    clearTimeout(timer);
    if (disposed || !playing || motion.matches || document.hidden) return;
    timer = setTimeout(() => {
      if (!disposed && playing && !motion.matches && !document.hidden && !focusOutsidePlayer())
        document.body.classList.add("is-watching");
    }, delay);
  }
  function activity() {
    restore();
    schedule(3000);
  }
  for (const event of events)
    document.addEventListener(event, activity, { passive: true, capture: true });
  document.addEventListener("visibilitychange", activity);
  document.addEventListener("fullscreenchange", activity);
  motion.addEventListener("change", activity);
  return {
    setPlaying(value: boolean) {
      if (disposed || playing === value) return;
      playing = value;
      restore();
      schedule(2000);
    },
    destroy() {
      disposed = true;
      clearTimeout(timer);
      restore();
      for (const event of events) document.removeEventListener(event, activity, true);
      document.removeEventListener("visibilitychange", activity);
      document.removeEventListener("fullscreenchange", activity);
      motion.removeEventListener("change", activity);
    },
  };
}
