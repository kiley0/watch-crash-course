import { expect, it } from "vite-plus/test";
import { bookSpread } from "./book-spread";

it("opens at the bookmark and advances without skipping or repeating chapters", () => {
  for (const total of [1, 4, 5, 8, 10, 12, 13, 28, 51]) {
    for (const bookmark of [0, Math.floor(total / 2), total - 1]) {
      const seen: number[] = [];
      let spread = 0;
      while (true) {
        const page = bookSpread(total, bookmark, spread);
        for (const [start, end] of [page.left, page.right]) {
          expect(end - start).toBeLessThanOrEqual(4);
          for (let index = start; index < end; index++) seen.push(index);
        }
        if (!page.hasNext) break;
        spread++;
      }
      expect(seen).toEqual(Array.from({ length: total - bookmark }, (_, i) => bookmark + i));
    }
  }
});

it("clamps stale spreads after progress moves the bookmark near the end", () => {
  expect(bookSpread(10, 8, 4)).toEqual({ spread: 0, left: [8, 8], right: [8, 10], hasNext: false });
  expect(bookSpread(10, 0, 1)).toEqual({ spread: 1, left: [4, 8], right: [8, 10], hasNext: false });
  expect(bookSpread(8, 0, 1)).toEqual({ spread: 1, left: [4, 8], right: [8, 8], hasNext: false });
});

it("handles an unloaded course and returning to the contents", () => {
  expect(bookSpread(0, 0, 2)).toEqual({ spread: 0, left: [0, 0], right: [0, 0], hasNext: false });
  expect(bookSpread(20, 0, -1).spread).toBe(0);
});
