export function videoUrl(videoId: string, playlistId: string): string {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  url.searchParams.set("list", playlistId);
  return url.href;
}
