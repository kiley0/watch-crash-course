import { afterEach, expect, it, vi } from "vite-plus/test";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.useRealTimers();
});
async function setup(host = "watchcrashcourse.com", preference = "on") {
  let stored = preference;
  const script = { dataset: {} as Record<string, string>, onload: () => {}, onerror: () => {} };
  const count = vi.fn();
  const payloads: Record<string, unknown>[] = [];
  const append = vi.fn();
  const win = {
    goatcounter: undefined as
      | undefined
      | {
          count?: typeof count;
          get_data?: (event: Record<string, unknown>) => Record<string, unknown>;
        },
    addEventListener: vi.fn(),
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal(
    "location",
    new URL(`https://${host}/watch.html?course=biology&video=tZE_fQFK8EY&search=private`),
  );
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  });
  vi.stubGlobal("document", { createElement: () => script, head: { append } });
  const analytics = await import("./analytics");
  analytics.startAnalytics();
  return {
    analytics,
    payloads,
    count,
    append,
    script,
    loaded: async () => {
      win.goatcounter = {
        count: count.mockImplementation((event) => {
          payloads.push(win.goatcounter!.get_data!(event));
        }),
        // Match count.js defaults: it includes raw queries and screen size even
        // when a custom path is supplied. The adapter must remove both.
        get_data: (event) => ({
          p: event.path,
          t: event.title,
          q: "search=private",
          s: 1920,
          b: 0,
        }),
      };
      script.onload();
      await Promise.resolve();
    },
  };
}
it("sends only normalized public IDs, with no referrer or arbitrary query data", async () => {
  const view = await setup();
  await view.loaded();
  expect(view.script.dataset.goatcounter).toBe("https://watchcrashcourse.goatcounter.com/count");
  expect(view.count).toHaveBeenCalledWith({
    path: "/watch.html?course=biology&video=tZE_fQFK8EY",
    title: "/watch.html?course=biology&video=tZE_fQFK8EY",
    referrer: "",
  });
  view.analytics.trackVideoPlay("biology", "tZE_fQFK8EY");
  await Promise.resolve();
  expect(view.count).toHaveBeenLastCalledWith(
    expect.objectContaining({
      path: "video-play:biology:tZE_fQFK8EY",
      event: true,
      no_session: true,
      referrer: "",
    }),
  );
  expect(view.analytics.analyticsPath(new URL("https://example.com/private/person?secret=x"))).toBe(
    "/other",
  );
});
it.each(["localhost", "127.0.0.1", "preview.vercel.app", "watchcrashcourse.com.attacker.test"])(
  "never loads analytics on %s",
  async (host) => {
    const view = await setup(host);
    view.analytics.trackVideoPlay("biology", "tZE_fQFK8EY");
    expect(view.append).not.toHaveBeenCalled();
  },
);
it("does not load when opted out", async () => {
  const view = await setup("watchcrashcourse.com", "off");
  expect(view.append).not.toHaveBeenCalled();
});
it("drops pending events when disabled while the script loads", async () => {
  const view = await setup();
  view.analytics.trackVideoPlay("biology", "tZE_fQFK8EY");
  view.analytics.saveAnalyticsPreference(false);
  await view.loaded();
  expect(view.count).not.toHaveBeenCalled();
});
it("fails closed if preference storage is unavailable", async () => {
  const view = await setup("localhost");
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  expect(view.analytics.analyticsEnabled()).toBe(false);
  expect(view.analytics.saveAnalyticsPreference(false)).toBe(false);
});
it("ignores malformed video event IDs", async () => {
  const view = await setup();
  await view.loaded();
  view.count.mockClear();
  view.analytics.trackVideoPlay("biology?secret=x", "tZE_fQFK8EY");
  view.analytics.trackVideoPlay("biology", "invalid");
  expect(view.count).not.toHaveBeenCalled();
});

it("removes the vendor client's separate raw query and screen-size fields", async () => {
  const view = await setup();
  await view.loaded();
  expect(view.payloads).toEqual([
    {
      p: "/watch.html?course=biology&video=tZE_fQFK8EY",
      t: "/watch.html?course=biology&video=tZE_fQFK8EY",
      r: "",
      e: false,
      ns: undefined,
      b: 0,
    },
  ]);
});
it("does not resurrect queued events after opting out and back in", async () => {
  const view = await setup();
  view.analytics.trackVideoPlay("biology", "tZE_fQFK8EY");
  view.analytics.saveAnalyticsPreference(false);
  view.analytics.saveAnalyticsPreference(true);
  await view.loaded();
  expect(view.count).not.toHaveBeenCalled();
});
it("drops events when the client fails to load", async () => {
  const view = await setup();
  view.script.onerror();
  await Promise.resolve();
  view.analytics.trackVideoPlay("biology", "tZE_fQFK8EY");
  await Promise.resolve();
  expect(view.count).not.toHaveBeenCalled();
});
it("starts only once", async () => {
  const view = await setup();
  view.analytics.startAnalytics();
  await view.loaded();
  expect(view.count).toHaveBeenCalledTimes(1);
});
