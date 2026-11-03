import { describe, expect, it } from "@jest/globals";
import { isAllowedFetchUrl } from "./allowedFetchUrl";

describe("isAllowedFetchUrl", () => {
  it("allows the theme store hosts over https", () => {
    expect(isAllowedFetchUrl("https://betterseqta.org/api/themes/abc/theme.json")).toBe(true);
    expect(isAllowedFetchUrl("https://accounts.betterseqta.org/x")).toBe(true);
    expect(
      isAllowedFetchUrl("https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/a.json"),
    ).toBe(true);
  });

  it("rejects other hosts, look-alikes, http, ports and credentials", () => {
    expect(isAllowedFetchUrl("https://example.com/")).toBe(false);
    expect(isAllowedFetchUrl("https://betterseqta.org.evil.com/")).toBe(false);
    expect(isAllowedFetchUrl("https://evilbetterseqta.org/")).toBe(false);
    expect(isAllowedFetchUrl("http://betterseqta.org/")).toBe(false);
    expect(isAllowedFetchUrl("https://betterseqta.org:8443/")).toBe(false);
    expect(isAllowedFetchUrl("https://user:pw@betterseqta.org/")).toBe(false);
    expect(isAllowedFetchUrl("http://127.0.0.1/")).toBe(false);
    expect(isAllowedFetchUrl("not a url")).toBe(false);
    expect(isAllowedFetchUrl(undefined)).toBe(false);
  });
});
