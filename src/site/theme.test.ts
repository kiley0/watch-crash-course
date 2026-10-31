import { afterEach, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
async function setup(value: string | null = null, blocked = false) {
  const dataset: Record<string, string> = {};
  const listeners = new Map<string, (event: { key: string | null }) => void>();
  const meta = { setAttribute: vi.fn() };
  let systemChange = () => {};
  const media = {
    matches: true,
    addEventListener: (_name: string, callback: () => void) => {
      systemChange = callback;
    },
  };
  const storage = {
    getItem: vi.fn(() => {
      if (blocked) throw new Error("blocked");
      return value;
    }),
    setItem: vi.fn(),
  };
  if (blocked)
    storage.setItem.mockImplementation(() => {
      throw new Error("blocked");
    });
  vi.stubGlobal("document", { documentElement: { dataset }, querySelector: () => meta });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    matchMedia: () => media,
    addEventListener: (name: string, callback: (event: { key: string | null }) => void) =>
      listeners.set(name, callback),
  });
  return {
    dataset,
    listeners,
    storage,
    media,
    meta,
    systemChange: () => systemChange(),
    theme: await import("./theme"),
  };
}
it("defaults to system and accepts only explicit light or dark choices", async () => {
  const { theme } = await setup();
  for (const value of [null, "system", "invalid", "DARK"])
    expect(theme.parseTheme(value)).toBe("system");
  expect(theme.parseTheme("light")).toBe("light");
  expect(theme.parseTheme("dark")).toBe("dark");
});
it("persists an explicit preference and updates cross-tab changes", async () => {
  const { theme, dataset, storage, listeners } = await setup("light");
  expect(theme.saveTheme("dark")).toBe(true);
  expect(dataset.theme).toBe("dark");
  expect(storage.setItem).toHaveBeenCalledWith(theme.THEME_KEY, "dark");
  listeners.get("storage")!({ key: theme.THEME_KEY });
  expect(dataset.theme).toBe("light");
});
it("applies a temporary choice when storage is blocked", async () => {
  const { theme, dataset } = await setup(null, true);
  expect(theme.readTheme()).toBe("system");
  expect(theme.saveTheme("dark")).toBe(false);
  expect(dataset.theme).toBe("dark");
});
it("follows system changes without overriding an explicit preference", async () => {
  const { theme, media, meta, systemChange } = await setup();
  expect(meta.setAttribute).toHaveBeenLastCalledWith("content", "#191e1c");
  media.matches = false;
  systemChange();
  expect(meta.setAttribute).toHaveBeenLastCalledWith("content", "#fbf7ee");
  theme.applyTheme("dark");
  systemChange();
  expect(meta.setAttribute).toHaveBeenLastCalledWith("content", "#191e1c");
});
it("returns to system when a different tab clears preferences", async () => {
  const { dataset, listeners, storage } = await setup("dark");
  storage.getItem.mockReturnValue(null);
  listeners.get("storage")!({ key: null });
  expect(dataset.theme).toBe("system");
});
