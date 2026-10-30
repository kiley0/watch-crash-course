// A restored page keeps old Alpine state. Re-read local progress on browser Back/Forward.
export function reloadOnRestore(): () => void {
  const restore = (event: PageTransitionEvent) => {
    if (event.persisted) window.location.reload();
  };
  window.addEventListener("pageshow", restore);
  return () => window.removeEventListener("pageshow", restore);
}
