/**
 * The content API host. Lite has no override: BetterSEQTA+ read one from the
 * SEQTA page's sessionStorage, which let any script on SEQTA point the
 * extension at another server.
 */
export const API_BASE = "https://betterseqta.org";

export function getApiBase(): string {
  return API_BASE;
}
