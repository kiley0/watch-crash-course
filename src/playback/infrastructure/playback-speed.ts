const SPEED_KEY = "watch-crash-course-playback-speed";
function validSpeed(speed: number): boolean {
  return Number.isFinite(speed) && speed >= 0.25 && speed <= 4;
}
export function readPlaybackSpeed(): number {
  try {
    const speed = Number(localStorage.getItem(SPEED_KEY));
    return validSpeed(speed) ? speed : 1;
  } catch {
    return 1;
  }
}
export function savePlaybackSpeed(speed: number): void {
  if (!validSpeed(speed)) return;
  try {
    localStorage.setItem(SPEED_KEY, String(speed));
  } catch {
    // Playback must keep working when browser storage is unavailable.
  }
}
