// The dated notice of the theme's layout (holiday shipping, closures): noticeText shows only between noticeFrom and
// noticeUntil (YYYY-MM-DD, inclusive), on the warehouse's calendar (shipTimezone). Decided on the server, so the notice
// is in the page's HTML and never flickers in.

// today's date (YYYY-MM-DD) in a time zone
export function today(timeZone: string, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function datedNotice(settings: Record<string, unknown>, date = today(String(settings.shipTimezone || "America/New_York"))) {
  const text = String(settings.noticeText || "").trim();
  const from = String(settings.noticeFrom || "");
  const until = String(settings.noticeUntil || "");
  if (!text || (from && date < from) || (until && date > until)) return "";
  return text;
}
