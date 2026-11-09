const IDLE_MS = 30000;
const PEEK_MS = 4000;
const activityEvents = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

export function createIdleBean() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bean = document.createElement("img");
  bean.src = "./curious-bean.svg";
  bean.alt = "";
  bean.className = "idle-bean";
  bean.setAttribute("aria-hidden", "true");
  bean.draggable = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let shown = false;
  let playing = false;
  let disposed = false;
  let suspended = false;
  function hide() {
    clearTimeout(hideTimer);
    bean.remove();
  }
  function reset() {
    clearTimeout(timer);
    if (disposed || suspended || shown || playing || document.hidden || reducedMotion.matches)
      return;
    timer = setTimeout(() => {
      if (disposed || suspended || shown || playing || document.hidden || reducedMotion.matches)
        return;
      shown = true;
      bean.classList.add("is-peeking");
      document.body.append(bean);
      hideTimer = setTimeout(hide, PEEK_MS);
    }, IDLE_MS);
  }
  function visibilityChanged() {
    if (document.hidden) hide();
    reset();
  }
  function motionChanged() {
    if (reducedMotion.matches) hide();
    reset();
  }
  function pageHide() {
    suspended = true;
    clearTimeout(timer);
    hide();
  }
  function pageShow() {
    suspended = false;
    reset();
  }
  for (const event of activityEvents)
    document.addEventListener(event, reset, { passive: true, capture: true });
  document.addEventListener("visibilitychange", visibilityChanged);
  reducedMotion.addEventListener("change", motionChanged);
  window.addEventListener("pagehide", pageHide);
  window.addEventListener("pageshow", pageShow);
  reset();
  return {
    setPlaying(value: boolean) {
      playing = value;
      if (playing) hide();
      reset();
    },
    destroy() {
      disposed = true;
      pageHide();
      for (const event of activityEvents) document.removeEventListener(event, reset, true);
      document.removeEventListener("visibilitychange", visibilityChanged);
      reducedMotion.removeEventListener("change", motionChanged);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", pageShow);
    },
  };
}
let instance: ReturnType<typeof createIdleBean> | undefined;
let playbackActive = false;
export function startIdleBean(): void {
  if (instance) return;
  instance = createIdleBean();
  instance.setPlaying(playbackActive);
}
export function setIdleBeanPlayback(active: boolean): void {
  playbackActive = active;
  instance?.setPlaying(active);
}
