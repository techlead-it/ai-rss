import { describe, it, expect } from "vite-plus/test";
import { parseFeed } from "./parse";

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>First &amp; foremost</title>
      <link>https://example.com/first</link>
      <guid isPermaLink="false">guid-1</guid>
      <pubDate>Wed, 17 Jun 2026 09:00:00 GMT</pubDate>
      <description>&lt;p&gt;An &lt;b&gt;excerpt&lt;/b&gt;&lt;/p&gt;</description>
    </item>
    <item>
      <title>Second</title>
      <link>https://example.com/second</link>
      <pubDate>Tue, 16 Jun 2026 09:00:00 GMT</pubDate>
      <description>Plain excerpt</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Example</title>
  <entry>
    <title>Atom entry</title>
    <link rel="alternate" href="https://example.org/entry"/>
    <id>tag:example.org,2026:entry</id>
    <updated>2026-06-15T12:00:00Z</updated>
    <summary>Atom summary text</summary>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("extracts items from an RSS 2.0 feed", () => {
    const items = parseFeed(RSS, "Example Feed");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      url: "https://example.com/first",
      guid: "guid-1",
      source: "Example Feed",
      title: "First & foremost",
      excerpt: "An excerpt",
      publishedAt: "2026-06-17T09:00:00.000Z",
    });
  });

  it("uses the link as guid fallback when guid is absent", () => {
    const items = parseFeed(RSS, "Example Feed");
    expect(items[1].guid).toBeNull();
    expect(items[1].url).toBe("https://example.com/second");
  });

  it("extracts entries from an Atom feed", () => {
    const items = parseFeed(ATOM, "Atom Example");
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      url: "https://example.org/entry",
      guid: "tag:example.org,2026:entry",
      source: "Atom Example",
      title: "Atom entry",
      excerpt: "Atom summary text",
      publishedAt: "2026-06-15T12:00:00.000Z",
    });
  });

  it("prefers Atom content over summary when both are present", () => {
    const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>F</title>
  <entry>
    <title>E</title>
    <link rel="alternate" href="https://e/1"/>
    <id>id-1</id>
    <updated>2026-06-15T12:00:00Z</updated>
    <summary>short summary</summary>
    <content>much longer full body content</content>
  </entry>
</feed>`;
    const items = parseFeed(atom, "F");
    expect(items[0].excerpt).toBe("much longer full body content");
  });
});
