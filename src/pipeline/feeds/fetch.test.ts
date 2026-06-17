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
  it("skips a failing feed, records the failure, and keeps processing the others", async () => {
    const http = fakeHttp({
      "https://a.example/feed": "throw",
      "https://b.example/feed": {
        ok: true,
        status: 200,
        text: RSS("https://b.example/post", "B post"),
      },
    });
    const result = await collectFeedItems(
      [
        { source: "A", url: "https://a.example/feed" },
        { source: "B", url: "https://b.example/feed" },
      ],
      http,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].source).toBe("B");
    expect(result.failures).toEqual([
      { source: "A", reason: "network error: https://a.example/feed" },
    ]);
  });

  it("records the HTTP status when a feed returns a non-ok response", async () => {
    const http = fakeHttp({
      "https://a.example/feed": { ok: false, status: 503, text: "" },
    });
    const result = await collectFeedItems(
      [{ source: "A", url: "https://a.example/feed" }],
      http,
    );
    expect(result.items).toEqual([]);
    expect(result.failures).toEqual([{ source: "A", reason: "HTTP 503" }]);
  });

  it("fetches feeds concurrently rather than strictly serially", async () => {
    // 各フィードの fetch を同期的に確定させ、開始の重なりを観測する。
    // 直列実装だと「次の fetch 開始時点で前の fetch は終了済み」なので overlap = 0、
    // 並列実装だと開始が同時に走るため overlap > 0 になる。
    let inFlight = 0;
    let maxInFlight = 0;
    const start = (): Promise<FetchResponse> =>
      new Promise((resolve) => {
        inFlight++;
        if (inFlight > maxInFlight) maxInFlight = inFlight;
        setTimeout(() => {
          inFlight--;
          resolve({
            ok: true,
            status: 200,
            text: RSS("https://x/1", "Title"),
          });
        }, 30);
      });
    const http: HttpClient = { fetch: () => start() };

    await collectFeedItems(
      Array.from({ length: 4 }, (_, i) => ({
        source: `S${i}`,
        url: `https://feed.test/${i}`,
      })),
      http,
    );
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("applies a per-feed keyword filter when present", async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>F</title>
<item><title>LLM prompt injection paper</title><link>https://x/1</link><description>d</description></item>
<item><title>New AES cryptanalysis</title><link>https://x/2</link><description>d</description></item>
</channel></rss>`;
    const http = fakeHttp({
      "https://arxiv.example/feed": { ok: true, status: 200, text: xml },
    });
    const result = await collectFeedItems(
      [
        {
          source: "arXiv",
          url: "https://arxiv.example/feed",
          keywords: ["prompt", "llm"],
        },
      ],
      http,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("LLM prompt injection paper");
    expect(result.failures).toEqual([]);
  });
});
