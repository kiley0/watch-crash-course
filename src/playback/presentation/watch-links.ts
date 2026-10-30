export function watchUrl(courseId: string, videoId: string): string {
  const query = new URLSearchParams({ course: courseId, video: videoId });
  return `./watch.html?${query}`;
}
