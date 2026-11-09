import { parsePlayerMode } from "../domain/player-mode";
import type { PlayerMode } from "../domain/player-mode";
export const PLAYER_MODE_KEY = "watch-crash-course-player-mode";
export function readPlayerMode(): PlayerMode {
  try {
    return parsePlayerMode(localStorage.getItem(PLAYER_MODE_KEY));
  } catch {
    return "privacy-enhanced";
  }
}
export function savePlayerMode(mode: PlayerMode): boolean {
  try {
    localStorage.setItem(PLAYER_MODE_KEY, parsePlayerMode(mode));
    return true;
  } catch {
    return false;
  }
}
