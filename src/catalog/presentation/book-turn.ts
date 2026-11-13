export function captureBookPage(book: HTMLElement, selector: string): HTMLElement | null {
  const source = book.querySelector<HTMLElement>(selector);
  if (!source) return null;
  const copy = source.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("template").forEach((element) => element.remove());
  for (const element of [copy, ...copy.querySelectorAll("*")]) {
    for (const attribute of element.getAttributeNames()) {
      if (
        attribute.startsWith("x-") ||
        attribute.startsWith(":") ||
        attribute.startsWith("@") ||
        attribute === "id"
      )
        element.removeAttribute(attribute);
    }
  }
  copy.removeAttribute("style");
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  return copy;
}

export async function animateBookTurn(
  book: HTMLElement,
  front: HTMLElement,
  back: HTMLElement,
  stationary: HTMLElement | null,
  forward: boolean,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  const leaf = document.createElement("div");
  leaf.className = `turning-leaf ${forward ? "turning-leaf-forward" : "turning-leaf-back"}`;
  leaf.setAttribute("aria-hidden", "true");
  leaf.inert = true;
  front.classList.add("leaf-front");
  back.classList.add("leaf-back");
  leaf.append(front, back);
  if (stationary) {
    stationary.classList.add(
      "stationary-page",
      forward ? "stationary-page-left" : "stationary-page-right",
    );
    book.append(stationary);
  }
  book.append(leaf);
  let animation: Animation | undefined;
  const cancel = () => animation?.cancel();
  try {
    animation = leaf.animate(
      [
        { transform: "perspective(1800px) rotateY(0deg)" },
        { transform: `perspective(1800px) rotateY(${forward ? -85 : 85}deg)`, offset: 0.5 },
        { transform: `perspective(1800px) rotateY(${forward ? -180 : 180}deg)` },
      ],
      { duration: 850, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" },
    );
    signal.addEventListener("abort", cancel, { once: true });
    await animation.finished;
  } catch {
    // Navigation has already completed; a decorative animation must not block it.
  } finally {
    signal.removeEventListener("abort", cancel);
    leaf.remove();
    stationary?.remove();
  }
}
