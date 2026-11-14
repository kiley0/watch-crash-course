// Use the space supplied by the facing page, without making the book taller.
export function fitHeroDescriptions(book: HTMLElement): () => void {
  const intro = book.querySelector<HTMLElement>(".notebook-intro");
  const entries = book.querySelector<HTMLElement>(".notebook-episode-entries");
  const footer = book.querySelector<HTMLElement>(".notebook-discoveries .notebook-page-footer");
  if (!intro || !entries || !footer) return () => {};
  const wide = window.matchMedia("(width >= 900px)");
  let frame = 0;
  const update = () => {
    frame = 0;
    entries.classList.remove("show-extra-descriptions");
    // Stacked pages can grow naturally; CSS shows their descriptions in full.
    if (!wide.matches) return;
    const available =
      footer.getBoundingClientRect().top -
      entries.getBoundingClientRect().top -
      parseFloat(getComputedStyle(entries).marginBlockEnd);
    entries.classList.add("show-extra-descriptions");
    entries.classList.toggle(
      "show-extra-descriptions",
      entries.getBoundingClientRect().height <= available,
    );
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(intro);
  resize.observe(entries);
  const content = new MutationObserver(schedule);
  content.observe(entries, { childList: true, characterData: true, subtree: true });
  wide.addEventListener("change", schedule);
  update();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    content.disconnect();
    wide.removeEventListener("change", schedule);
  };
}
