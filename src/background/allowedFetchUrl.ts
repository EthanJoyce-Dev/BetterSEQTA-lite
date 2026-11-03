/** Where the theme store downloads from: the BetterSEQTA API and its GitHub fallback. */
const ALLOWED_HOSTS = ["betterseqta.org", "raw.githubusercontent.com"];

/**
 * `fetchFromUrl` runs with the extension's access to every site, so it only
 * fetches https URLs on the theme store's hosts (or their subdomains).
 */
export function isAllowedFetchUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
