/**
 * Returns the URL if it's http(s), else null. News comes from outside RSS
 * feeds, so links and images must not accept javascript: or other schemes.
 */
export function httpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Feed descriptions often contain HTML; keep only the text (DOMParser output is inert). */
export function plainText(html: string): string {
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
}
