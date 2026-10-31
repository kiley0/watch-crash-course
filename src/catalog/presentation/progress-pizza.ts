// SVG geometry belongs to presentation; completion remains owned by learning.
export function progressPizza(completed: boolean[]): {
  divisions: string;
  crust: string;
  cheese: string;
  toppings: string;
} {
  const paths = { divisions: "", crust: "", cheese: "", toppings: "" };
  if (!completed.length) return paths;
  const step = (Math.PI * 2) / completed.length;
  const point = (radius: number, angle: number) =>
    `${(200 + radius * Math.cos(angle)).toFixed(3)} ${(200 + radius * Math.sin(angle)).toFixed(3)}`;
  const wedge = (radius: number, start: number, end: number) =>
    `M200 200L${point(radius, start)}A${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${point(radius, end)}Z`;
  completed.forEach((isComplete, index) => {
    const start = -Math.PI / 2 + index * step;
    const end = start + step;
    // Two half-arcs also support a one-episode course without a degenerate full circle.
    const middle = start + step / 2;
    paths.divisions += `M200 200L${point(160, start)}`;
    if (!isComplete) return;
    paths.crust += wedge(160, start, middle) + wedge(160, middle, end);
    paths.cheese += wedge(143, start, middle) + wedge(143, middle, end);
    const toppingRadius = Math.min(9, step * 100 * 0.25);
    paths.toppings += `M${point(100, middle)}m-${toppingRadius} 0a${toppingRadius} ${toppingRadius} 0 1 0 ${2 * toppingRadius} 0a${toppingRadius} ${toppingRadius} 0 1 0 -${2 * toppingRadius} 0`;
  });
  return paths;
}
