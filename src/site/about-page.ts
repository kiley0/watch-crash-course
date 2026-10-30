import "./styles.css";

const surpriseButton = document.querySelector<HTMLButtonElement>("#reveal-surprise");
const surprise = document.querySelector<HTMLDivElement>("#tiny-surprise");

if (surpriseButton && surprise) {
  surpriseButton.addEventListener("click", () => {
    surprise.hidden = !surprise.hidden;
    surpriseButton.setAttribute("aria-expanded", String(!surprise.hidden));
    surpriseButton.setAttribute(
      "aria-label",
      surprise.hidden ? "Reveal a small surprise" : "Hide the small surprise",
    );
  });
}
