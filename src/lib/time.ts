const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const relative = new Intl.RelativeTimeFormat("it", { numeric: "auto", style: "short" });
const absolute = new Intl.DateTimeFormat("it", { dateStyle: "short", timeStyle: "short" });

/** Relative for recent times, absolute date-time beyond a week. */
export function formatTimestamp(timestamp: number, now: number): string {
  // These are always past events; clamp so a stale `now` never reads "in 13s".
  const delta = Math.min(0, timestamp - now);
  const magnitude = -delta;
  if (magnitude < MINUTE) return relative.format(Math.round(delta / 1000), "second");
  if (magnitude < HOUR) return relative.format(Math.round(delta / MINUTE), "minute");
  if (magnitude < DAY) return relative.format(Math.round(delta / HOUR), "hour");
  if (magnitude < WEEK) return relative.format(Math.round(delta / DAY), "day");
  return absolute.format(timestamp);
}

export function formatAbsolute(timestamp: number): string {
  return absolute.format(timestamp);
}
