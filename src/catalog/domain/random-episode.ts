export interface EpisodeChoice {
  courseId: string;
  videoId: string;
}

export function pickUnseenEpisode(
  episodes: readonly EpisodeChoice[],
  watchedVideoIds: readonly string[],
  random: () => number = Math.random,
): EpisodeChoice | null {
  const watched = new Set(watchedVideoIds);
  const unique = new Map<string, EpisodeChoice>();
  for (const episode of episodes) {
    if (!watched.has(episode.videoId)) unique.set(episode.videoId, episode);
  }
  const unseen = [...unique.values()];
  return unseen.length ? unseen[Math.floor(random() * unseen.length)]! : null;
}
