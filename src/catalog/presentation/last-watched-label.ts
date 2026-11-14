// Compare local calendar days so yesterday stays yesterday across daylight-saving changes.
export function lastWatchedLabel(timestamp: number, now = Date.now()): string {
  const calendarDay = (value: number) => {
    const date = new Date(value);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const days = Math.max(0, Math.round((calendarDay(now) - calendarDay(timestamp)) / 86_400_000));
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (days < 7) return format.format(-days, "day");
  if (days < 30) return format.format(-Math.floor(days / 7), "week");
  if (days < 365) return format.format(-Math.floor(days / 30), "month");
  return format.format(-Math.floor(days / 365), "year");
}
