import { describe, expect, it } from "@jest/globals";
import { httpUrl } from "./newsFeedContent";

describe("httpUrl", () => {
  it("keeps http and https links", () => {
    expect(httpUrl("https://www.abc.net.au/news/story")).toBe("https://www.abc.net.au/news/story");
    expect(httpUrl("http://example.com/a b")).toBe("http://example.com/a%20b");
  });

  it("rejects other schemes, junk and non-strings", () => {
    expect(httpUrl("javascript:alert(1)")).toBeNull();
    expect(httpUrl(" JavaScript:alert(1)")).toBeNull();
    expect(httpUrl("data:text/html,hi")).toBeNull();
    expect(httpUrl("null")).toBeNull();
    expect(httpUrl(undefined)).toBeNull();
    expect(httpUrl(42)).toBeNull();
  });

  it("encodes quotes so the URL can't break out of url(\"...\")", () => {
    expect(httpUrl('https://example.com/a"b)c')).not.toContain('"');
  });
});
