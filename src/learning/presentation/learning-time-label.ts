export function learningTimeLabel(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const parts: string[] = [];
  for (const [unit, value] of [
    ["hour", Math.floor(total / 3600)],
    ["minute", Math.floor((total % 3600) / 60)],
    ["second", total % 60],
  ] as const) {
    if (value || (unit === "second" && !parts.length)) {
      parts.push(
        new Intl.NumberFormat(undefined, { style: "unit", unit, unitDisplay: "long" }).format(
          value,
        ),
      );
    }
  }
  return new Intl.ListFormat(undefined, { style: "long", type: "conjunction" }).format(parts);
}
