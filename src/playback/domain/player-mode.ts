export type PlayerMode = "privacy-enhanced" | "standard";
export function parsePlayerMode(value: unknown): PlayerMode {
  return value === "standard" ? "standard" : "privacy-enhanced";
}
export function playerHost(mode: PlayerMode): string {
  return mode === "standard" ? "https://www.youtube.com" : "https://www.youtube-nocookie.com";
}
