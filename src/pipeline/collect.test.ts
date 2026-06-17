import { describe, it, expect, beforeEach } from "vite-plus/test";
import { runCollection, type PipelineDeps } from "./collect";
import { Repository } from "../repository/repository";
import { createTestD1 } from "../repository/d1-fake";
import { createFakeAiEngine } from "../ai/fake";
import { NeuronLimitError } from "../ai/errors";
import type { HttpClient } from "./http";
import type { AiEngine } from "../ai/engine";
import type { ArticleAnalysis } from "./types";

const FEED_URL = "https://feed.test/rss";

function rss(items: Array<{ url: string; title: string }>): string {
  const entries = items
    .map(
      (i) =>
        `<item><title>${i.title}</title><link>${i.url}</link>` +
        `<pubDate>Wed, 17 Jun 2026 09:00:00 GMT</pubDate>` +
        `<description>desc ${i.title}</description></item>`,
    )
    .join("");
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>F</title>${entries}</channel></rss>`;
}

const richHtml = (text: string) =>
  `<article><h1>${text}</h1><p>${"本文の段落。".repeat(40)}</p></article>`;

function fakeHttp(
  feedXml: string,
  failBody: Set<string> = new Set(),
): HttpClient {
  return {
    async fetch(url) {
      if (url === FEED_URL) return { ok: true, status: 200, text: feedXml };
      if (failBody.has(url)) return { ok: false, status: 403, text: "" };
      return { ok: true, status: 200, text: richHtml(url) };
    },
  };
}

function scriptedAi(
  fn: (
    input: Parameters<AiEngine["analyze"]>[0],
    n: number,
  ) => Promise<ArticleAnalysis>,
): AiEngine {
  let n = 0;
  return { analyze: (input) => fn(input, n++) };
}

let repo: Repository;
function baseDeps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    feeds: [{ source: "Test", url: FEED_URL }],
    http: fakeHttp(rss([])),
    ai: createFakeAiEngine(),
    repo,
    sleep: async () => {},
    ...overrides,
  };
}

beforeEach(() => {
  repo = new Repository(createTestD1());
});

describe("runCollection happy path", () => {
  it("collects, summarizes and persists new AI-security articles", async () => {
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
      { url: "https://art.test/2", title: "AI security vulnerability found" },
    ]);
    const summary = await runCollection(baseDeps({ http: fakeHttp(feed) }));

    expect(summary.saved).toBe(2);
    expect(summary.newCount).toBe(2);
    const list = await repo.listArticles({ page: 1, perPage: 20 });
    expect(list.total).toBe(2);
    expect(list.items[0].summary).toContain("要約");
  });
});

describe("runCollection dedup and filters", () => {
  it("skips already-stored articles via dedup", async () => {
    const categoryId = await repo.getOrCreateCategory("セキュリティ", "security");
    await repo.saveArticle({
      url: "https://art.test/1",
      guid: null,
      source: "Test",
      title: "既存",
      categoryId,
      summary: "s",
      detail: "d",
      originalLang: "ja",
      publishedAt: null,
      fetchFailed: false,
      labelIds: [],
    });
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
      { url: "https://art.test/2", title: "AI security vulnerability found" },
    ]);
    const summary = await runCollection(baseDeps({ http: fakeHttp(feed) }));
    expect(summary.newCount).toBe(1);
    expect(summary.saved).toBe(1);
  });

  it("excludes obviously unrelated items in the first-pass filter", async () => {
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
      { url: "https://art.test/2", title: "週末のおすすめレシピ集" },
    ]);
    const summary = await runCollection(baseDeps({ http: fakeHttp(feed) }));
    expect(summary.saved).toBe(1);
    expect(summary.excluded).toBeGreaterThanOrEqual(1);
  });

  it("excludes items the AI judges not relevant (second pass)", async () => {
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
    ]);
    const ai = createFakeAiEngine({ relevant: false });
    const summary = await runCollection(baseDeps({ http: fakeHttp(feed), ai }));
    expect(summary.saved).toBe(0);
    expect(summary.excluded).toBe(1);
  });
});

describe("runCollection caps and fallbacks", () => {
  it("caps processing at N and defers the rest", async () => {
    const items = Array.from({ length: 4 }, (_, i) => ({
      url: `https://art.test/${i}`,
      title: `LLM prompt injection ${i}`,
    }));
    const summary = await runCollection(
      baseDeps({ http: fakeHttp(rss(items)), cap: 2 }),
    );
    expect(summary.saved).toBe(2);
    expect(summary.deferred).toBe(2);
  });

  it("falls back to RSS excerpt and flags fetch failure", async () => {
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
    ]);
    const summary = await runCollection(
      baseDeps({
        http: fakeHttp(feed, new Set(["https://art.test/1"])),
      }),
    );
    expect(summary.fetchFailed).toBe(1);
    expect(summary.saved).toBe(1);
    const list = await repo.listArticles({ page: 1, perPage: 20 });
    expect(list.items[0].fetchFailed).toBe(true);
  });
});

describe("runCollection AI error handling", () => {
  it("retries transient AI errors then skips after exhausting retries", async () => {
    const slept: number[] = [];
    const ai = scriptedAi(async () => {
      throw new Error("temporary upstream error");
    });
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
    ]);
    const summary = await runCollection(
      baseDeps({
        http: fakeHttp(feed),
        ai,
        maxRetries: 2,
        sleep: async (ms) => {
          slept.push(ms);
        },
      }),
    );
    expect(summary.aiErrors).toBe(1);
    expect(summary.saved).toBe(0);
    expect(slept.length).toBe(2); // 2 retries before giving up
  });

  it("recovers when a transient AI error succeeds on retry", async () => {
    const ai = scriptedAi(async (_input, n) => {
      if (n === 0) throw new Error("temporary");
      return {
        relevant: true,
        summary: "復帰要約",
        detail: "- 要点",
        labels: [],
        originalLang: "en",
      };
    });
    const feed = rss([
      { url: "https://art.test/1", title: "LLM prompt injection attack" },
    ]);
    const summary = await runCollection(
      baseDeps({ http: fakeHttp(feed), ai }),
    );
    expect(summary.saved).toBe(1);
  });

  it("commits processed work and exits cleanly when the Neuron limit is hit", async () => {
    const ai = scriptedAi(async (_input, n) => {
      if (n >= 1) throw new NeuronLimitError();
      return {
        relevant: true,
        summary: "要約",
        detail: "- 要点",
        labels: [],
        originalLang: "en",
      };
    });
    const items = Array.from({ length: 3 }, (_, i) => ({
      url: `https://art.test/${i}`,
      title: `LLM prompt injection ${i}`,
    }));
    const summary = await runCollection(
      baseDeps({ http: fakeHttp(rss(items)), ai }),
    );
    expect(summary.neuronLimitReached).toBe(true);
    expect(summary.saved).toBe(1);
    const list = await repo.listArticles({ page: 1, perPage: 20 });
    expect(list.total).toBe(1);
  });
});

describe("runCollection summary log", () => {
  it("emits a collection summary line", async () => {
    const logs: string[] = [];
    await runCollection(
      baseDeps({ http: fakeHttp(rss([])), logger: (m) => logs.push(m) }),
    );
    expect(logs.some((l) => l.includes("収集サマリ"))).toBe(true);
  });
});
