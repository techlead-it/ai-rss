import { describe, it, expect } from "vite-plus/test";
import { dedupKey, normalizeUrl } from "./dedup";

describe("normalizeUrl", () => {
  it("lowercases the scheme and host", () => {
    expect(normalizeUrl("HTTPS://Example.COM/Path")).toBe(
      "https://example.com/Path",
    );
  });

  it("strips utm_*, fbclid, gclid and mailchimp tracking parameters", () => {
    expect(
      normalizeUrl(
        "https://e.com/a?utm_source=x&utm_medium=y&fbclid=z&gclid=g&mc_cid=c&mc_eid=e&id=1",
      ),
    ).toBe("https://e.com/a?id=1");
  });

  it("removes a trailing slash except for the root path", () => {
    expect(normalizeUrl("https://e.com/a/")).toBe("https://e.com/a");
    expect(normalizeUrl("https://e.com/")).toBe("https://e.com/");
  });

  it("preserves the fragment when present", () => {
    expect(normalizeUrl("https://e.com/a#section")).toBe(
      "https://e.com/a#section",
    );
  });

  it("treats unparseable input as the raw string trimmed", () => {
    expect(normalizeUrl("  not a url  ")).toBe("not a url");
  });
});

describe("dedupKey", () => {
  it("returns the normalized url when present", () => {
    expect(dedupKey({ url: "https://Example.com/a/", guid: "g-1" })).toBe(
      "https://example.com/a",
    );
  });

  it("collapses tracking-parameter variants of the same article into one key", () => {
    const a = dedupKey({ url: "https://e.com/a?utm_source=x&id=1", guid: null });
    const b = dedupKey({ url: "https://e.com/a?id=1", guid: null });
    expect(a).toBe(b);
  });

  it("falls back to the guid when the url is empty", () => {
    expect(dedupKey({ url: "", guid: "guid-123" })).toBe("guid-123");
  });

  it("returns null when neither url nor guid is usable", () => {
    expect(dedupKey({ url: "   ", guid: null })).toBeNull();
  });
});
