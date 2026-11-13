// Half-open episode ranges for the contents spread, then four chapters per page.
export function bookSpread(total: number, bookmark: number, requestedSpread: number) {
  const start = Math.max(0, Math.min(bookmark, total - 1));
  const lastSpread = Math.max(0, Math.ceil((total - start - 4) / 8));
  const spread = Math.max(0, Math.min(requestedSpread, lastSpread));
  const leftStart = spread ? start + 4 + (spread - 1) * 8 : start;
  const rightStart = Math.min(total, start + spread * 8);
  return {
    spread,
    left: [leftStart, spread ? Math.min(leftStart + 4, total) : leftStart] as const,
    right: [rightStart, Math.min(rightStart + 4, total)] as const,
    hasNext: spread < lastSpread,
  };
}
