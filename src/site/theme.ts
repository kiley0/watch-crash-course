export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "watch-crash-course-theme";

export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function readTheme(): ThemePreference {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}
export function applyTheme(preference: ThemePreference): void {
  document.documentElement.dataset.theme = preference;
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#191e1c" : "#fbf7ee");
}
export function saveTheme(preference: ThemePreference): boolean {
  applyTheme(preference);
  try {
    localStorage.setItem(THEME_KEY, preference);
    return true;
  } catch {
    return false;
  }
}
window.addEventListener("storage", (event) => {
  if (event.key === THEME_KEY || event.key === null) applyTheme(readTheme());
});
window.addEventListener("pageshow", () => applyTheme(readTheme()));

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  applyTheme(parseTheme(document.documentElement.dataset.theme));
});
applyTheme(readTheme());
