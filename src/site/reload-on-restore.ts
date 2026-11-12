// Refresh saved state without discarding restored filters, focus, and scroll position.
export function refreshOnRestore(refresh: () => void | Promise<void>): () => void {
  const restore = (event: PageTransitionEvent) => {
    if (event.persisted) void refresh();
  };
  window.addEventListener("pageshow", restore);
  return () => window.removeEventListener("pageshow", restore);
}

// Settings must discard stale import/clear confirmations and reinitialize storage recovery.
export function reloadOnRestore(): () => void {
  return refreshOnRestore(() => window.location.reload());
}
