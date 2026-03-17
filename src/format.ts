/**
 * Smart reset countdown formatter.
 * - < 2h: relative (↻1h32m)
 * - Same day: 12-hour am/pm
 * - Otherwise: lowercase month+day
 */
export function formatReset(isoDate: string | undefined | null): string {
  if (!isoDate) return "";
  const reset = new Date(isoDate);
  const now = new Date();
  if (isNaN(reset.getTime())) return "";

  const diffMs = reset.getTime() - now.getTime();
  if (diffMs <= 0) return "\u21bb now";

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 120) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return "\u21bb " + (h > 0 ? h + "h" : "") + (m > 0 || h === 0 ? m + "m" : "");
  }

  if (reset.toDateString() === now.toDateString()) {
    let hr = reset.getHours();
    const mn = String(reset.getMinutes()).padStart(2, "0");
    const ampm = hr >= 12 ? "pm" : "am";
    hr = hr % 12 || 12;
    return `\u21bb ${hr}:${mn}${ampm}`;
  }

  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  const mon = months[reset.getMonth()];
  const day = reset.getDate();
  let hr = reset.getHours();
  const mn = String(reset.getMinutes()).padStart(2, "0");
  const ampm = hr >= 12 ? "pm" : "am";
  hr = hr % 12 || 12;
  return `\u21bb ${mon} ${day}, ${hr}:${mn}${ampm}`;
}
