import { describe, expect, it } from "vite-plus/test";
import { progressPizza } from "./progress-pizza";

describe("course progress pizza", () => {
  it("leaves the pan empty until an episode is completed", () => {
    const pizza = progressPizza([false, false]);
    expect(pizza.crust).toBe("");
    expect(pizza.cheese).toBe("");
    expect(pizza.toppings).toBe("");
    expect(pizza.divisions.match(/M200 200L/g)).toHaveLength(2);
  });
  it("fills the matching episode slice even when lessons are completed out of order", () => {
    const first = progressPizza([true, false, false, false]);
    const second = progressPizza([false, true, false, false]);
    expect(first.cheese).not.toBe(second.cheese);
    expect(first.divisions).toBe(second.divisions);
    expect(second.crust).toContain("M200 200L360.000 200.000");
  });
  it("supports empty, single-episode, and complete courses without invalid geometry", () => {
    expect(progressPizza([])).toEqual({ divisions: "", crust: "", cheese: "", toppings: "" });
    for (const total of [1, 16, 50]) {
      const pizza = progressPizza(Array.from({ length: total }, () => true));
      expect(pizza.cheese.match(/M200 200L/g)).toHaveLength(total * 2);
      expect(pizza.cheese).not.toMatch(/NaN|Infinity/);
      expect(pizza.toppings.match(/m-/g)).toHaveLength(total);
    }
  });
});
