// Only public page/course/video identifiers belong here; never read progress storage.
export const ANALYTICS_KEY = "watch-crash-course-analytics";
type Count = {
  path: string;
  title: string;
  event?: boolean;
  no_session?: boolean;
  referrer: string;
};
type GoatWindow = Window & {
  goatcounter?: {
    no_onload?: boolean;
    count?: (event: Count) => void;
    get_data?: (event: Count) => Record<string, unknown>;
  };
};
let enabled = true;
let loading: Promise<boolean> | undefined;
let preferenceVersion = 0;
export function analyticsEnabled(): boolean {
  try {
    return enabled && localStorage.getItem(ANALYTICS_KEY) !== "off";
  } catch {
    return false;
  }
}
export function saveAnalyticsPreference(value: boolean): boolean {
  enabled = value;
  preferenceVersion++;
  try {
    localStorage.setItem(ANALYTICS_KEY, value ? "on" : "off");
    return true;
  } catch {
    return false;
  }
}
function allowed(): boolean {
  return (
    location.protocol === "https:" &&
    ["watchcrashcourse.com", "www.watchcrashcourse.com"].includes(location.hostname) &&
    analyticsEnabled()
  );
}
function load(): Promise<boolean> {
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement("script");
    (window as GoatWindow).goatcounter = { no_onload: true };
    script.src = "https://gc.zgo.at/count.js";
    script.async = true;
    script.dataset.goatcounter = "https://watchcrashcourse.goatcounter.com/count";
    const timer = setTimeout(() => resolve(false), 10000);
    script.onload = () => {
      clearTimeout(timer);
      const goat = (window as GoatWindow).goatcounter;
      const getData = goat?.get_data;
      if (!goat || !getData || !goat.count) {
        resolve(false);
        return;
      }
      // count.js adds raw location.search (q) and screen width (s), independently
      // of our normalized path. Allow only the fields this site needs.
      goat.get_data = (event) => ({
        p: event.path,
        t: event.title,
        r: "",
        e: !!event.event,
        ns: event.no_session,
        b: getData(event).b,
      });
      resolve(true);
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    document.head.append(script);
  });
  return loading;
}
async function send(event: Count): Promise<void> {
  if (!allowed()) return;
  const version = preferenceVersion;
  try {
    if ((await load()) && allowed() && version === preferenceVersion)
      (window as GoatWindow).goatcounter?.count?.(event);
  } catch {
    // Analytics must never interrupt watching or saving progress.
  }
}
export function analyticsPath(url: URL): string {
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  if (path === "/course.html" || path === "/watch.html") {
    const key = path === "/course.html" ? "id" : "course";
    const course = url.searchParams.get(key) ?? "";
    const video = url.searchParams.get("video") ?? "";
    if (/^[a-z0-9-]{1,100}$/.test(course)) {
      return (
        `${path}?${key}=${course}` +
        (path === "/watch.html" && /^[A-Za-z0-9_-]{11}$/.test(video) ? `&video=${video}` : "")
      );
    }
  }
  return [
    "/index.html",
    "/study-hall.html",
    "/history.html",
    "/settings.html",
    "/about.html",
    "/course.html",
    "/watch.html",
  ].includes(path)
    ? path
    : "/other";
}
export function trackVideoPlay(courseId: string, videoId: string): void {
  if (!/^[a-z0-9-]{1,100}$/.test(courseId) || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
  void send({
    path: `video-play:${courseId}:${videoId}`,
    title: `Video play: ${courseId} / ${videoId}`,
    event: true,
    no_session: true,
    referrer: "",
  });
}
let started = false;
export function startAnalytics(): void {
  if (started) return;
  started = true;
  window.addEventListener("storage", (event) => {
    if (event.key === ANALYTICS_KEY || event.key === null) {
      enabled = true;
      preferenceVersion++;
    }
  });
  const path = analyticsPath(new URL(location.href));
  void send({ path, title: path, referrer: "" });
}
