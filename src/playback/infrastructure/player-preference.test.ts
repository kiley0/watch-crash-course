import { afterEach, expect, it, vi } from "vite-plus/test";
import { PLAYER_MODE_KEY, readPlayerMode, savePlayerMode } from "./player-preference";
import { parsePlayerMode, playerHost } from "../domain/player-mode";
afterEach(() => vi.unstubAllGlobals());
it.each([null, "", "bad", "https://attacker.test", "privacy-enhanced"])(
  "defaults safely for %s",
  (value) => {
    vi.stubGlobal("localStorage", { getItem: () => value });
    expect(readPlayerMode()).toBe("privacy-enhanced");
    expect(playerHost(parsePlayerMode(value))).toBe("https://www.youtube-nocookie.com");
  },
);
it("persists both modes using only its own key", () => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key),
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  expect(savePlayerMode("standard")).toBe(true);
  expect(readPlayerMode()).toBe("standard");
  expect(playerHost(readPlayerMode())).toBe("https://www.youtube.com");
  expect([...stored.keys()]).toEqual([PLAYER_MODE_KEY]);
  expect(savePlayerMode("privacy-enhanced")).toBe(true);
  expect(readPlayerMode()).toBe("privacy-enhanced");
});
it("falls back to privacy-enhanced mode when storage is blocked", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  expect(readPlayerMode()).toBe("privacy-enhanced");
  expect(savePlayerMode("standard")).toBe(false);
});

it("preserves the previously saved mode when a new choice cannot be written", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "standard",
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(savePlayerMode("privacy-enhanced")).toBe(false);
  expect(readPlayerMode()).toBe("standard");
});
