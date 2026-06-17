import { describe, it, expect } from "vite-plus/test";
import { collectFeedItems } from "./fetch";
import type { HttpClient, FetchResponse } from "../http";

const RSS = (link: string, title: string) => `<?xml version="1.0"?>
<rss version="2.0"><channel><title>F</title>
<item><title>${title}</title><link>${link}</link><pubDate>Wed, 17 Jun 2026 09:00:00 GMT</pubDate><description>x</description></item>
</channel></rss>`;

function fakeHttp(map: Record<string, FetchResponse | "throw">): HttpClient {
  return {
    async fetch(url) {
      const entry = map[url];
      if (entry === "throw" || entry === undefined) {
        throw new Error(`network error: ${url}`);
      }
      return entry;
    },
  };
}

describe("collectFeedItems", () => {
  it("skips a failing feed and keeps processing the others", async () => {
    const http = fakeHttp({
      "https://a.example/feed": "throw",
      "https://b.example/feed": {
        ok: true,
        status: 200,
        text: RSS("https://b.example/post", "B post"),
      },
    });
    const items = await collectFeedItems(
      [
        { source: "A", url: "https://a.example/feed" },
        { source: "B", url: "https://b.example/feed" },
      ],
      http,
    );
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe("B");
  });

  it("skips feeds returning a non-ok response", async () => {
    const http = fakeHttp({
      "https://a.example/feed": { ok: false, status: 403, text: "" },
    });
    const items = await collectFeedItems(
      [{ source: "A", url: "https://a.example/feed" }],
      http,
    );
    expect(items).toEqual([]);
  });

  it("applies a per-feed keyword filter when present", async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>F</title>
<item><title>LLM prompt injection paper</title><link>https://x/1</link><description>d</description></item>
<item><title>New AES cryptanalysis</title><link>https://x/2</link><description>d</description></item>
</channel></rss>`;
    const http = fakeHttp({
      "https://arxiv.example/feed": { ok: true, status: 200, text: xml },
    });
    const items = await collectFeedItems(
      [
        {
          source: "arXiv",
          url: "https://arxiv.example/feed",
          keywords: ["prompt", "llm"],
        },
      ],
      http,
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("LLM prompt injection paper");
  });
});
