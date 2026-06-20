import { describe, it, expect } from "vite-plus/test";
import { extractArticleText, resolveArticleBody } from "./extract";
import type { HttpClient } from "./http";
import type { FeedItem } from "./types";

const RICH_PARAGRAPH =
  "これは記事の本文です。".repeat(30); // > 200 chars

const ARTICLE_HTML = `<!doctype html><html><head><title>t</title>
<style>.x{}</style></head><body>
<nav>メニュー リンク集</nav>
<header>サイトヘッダー</header>
<article><h1>見出し</h1><p>${RICH_PARAGRAPH}</p></article>
<footer>フッターのリンク</footer>
</body></html>`;

function http(map: Record<string, { ok: boolean; status: number; text: string } | "throw">): HttpClient {
  return {
    async fetch(url) {
      const e = map[url];
      if (e === "throw" || e === undefined) throw new Error("network");
      return e;
    },
  };
}

const item = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  url: "https://example.com/post",
  guid: null,
  source: "Example",
  title: "Title",
  excerpt: "RSSの抜粋テキスト",
  publishedAt: null,
  ...overrides,
});

describe("extractArticleText", () => {
  it("extracts the <article> body and drops nav/header/footer chrome", () => {
    const text = extractArticleText(ARTICLE_HTML);
    expect(text).toContain("見出し");
    expect(text).toContain("これは記事の本文です。");
    expect(text).not.toContain("メニュー");
    expect(text).not.toContain("フッター");
  });

  it("isolates div[role=main] from sibling sidebars when no <article>/<main>", () => {
    const sidebarNoise = "サイドバーの関連リンク。".repeat(60);
    const html = `<body>
<div class="sidebar"><p>${sidebarNoise}</p></div>
<div role="main"><p>${RICH_PARAGRAPH}</p></div>
</body>`;
    const text = extractArticleText(html);
    expect(text).toContain("これは記事の本文です。");
    expect(text).not.toContain("サイドバーの関連リンク。");
  });

  it("isolates div.entry-content from sibling related-posts", () => {
    const related = "関連記事のリンクテキスト。".repeat(60);
    const html = `<body>
<div class="related-posts"><p>${related}</p></div>
<div class="entry-content"><p>${RICH_PARAGRAPH}</p></div>
</body>`;
    const text = extractArticleText(html);
    expect(text).toContain("これは記事の本文です。");
    expect(text).not.toContain("関連記事のリンクテキスト。");
  });

  it("isolates div.post-content from sibling comment blocks", () => {
    const comments = "コメント欄のノイズ。".repeat(60);
    const html = `<body>
<div class="post-content"><p>${RICH_PARAGRAPH}</p></div>
<div class="comments-area"><p>${comments}</p></div>
</body>`;
    const text = extractArticleText(html);
    expect(text).toContain("これは記事の本文です。");
    expect(text).not.toContain("コメント欄のノイズ。");
  });

  it("isolates div.article-content and div.article-body variants", () => {
    const noise = "サイトの広告ブロック。".repeat(60);
    const html1 = `<body>
<div class="article-content"><p>${RICH_PARAGRAPH}</p></div>
<div class="ad-slot"><p>${noise}</p></div></body>`;
    expect(extractArticleText(html1)).toContain("これは記事の本文です。");
    expect(extractArticleText(html1)).not.toContain("サイトの広告ブロック。");

    const html2 = `<body>
<div class="ad-slot"><p>${noise}</p></div>
<div class="article-body"><p>${RICH_PARAGRAPH}</p></div></body>`;
    expect(extractArticleText(html2)).toContain("これは記事の本文です。");
    expect(extractArticleText(html2)).not.toContain("サイトの広告ブロック。");
  });
});

describe("resolveArticleBody", () => {
  it("returns extracted body and the same full text as bodyForStorage on success", async () => {
    const result = await resolveArticleBody(
      item(),
      http({ "https://example.com/post": { ok: true, status: 200, text: ARTICLE_HTML } }),
    );
    expect(result.fetchFailed).toBe(false);
    expect(result.body).toContain("これは記事の本文です。");
    expect(result.bodyForStorage).toBe(result.body);
  });

  it("falls back to RSS excerpt with bodyForStorage=null on a non-ok response", async () => {
    const result = await resolveArticleBody(
      item(),
      http({ "https://example.com/post": { ok: false, status: 403, text: "" } }),
    );
    expect(result).toEqual({
      body: "RSSの抜粋テキスト",
      bodyForStorage: null,
      fetchFailed: true,
    });
  });

  it("falls back to RSS excerpt with bodyForStorage=null on a network error", async () => {
    const result = await resolveArticleBody(item(), http({}));
    expect(result).toEqual({
      body: "RSSの抜粋テキスト",
      bodyForStorage: null,
      fetchFailed: true,
    });
  });

  it("falls back when the fetched body is too thin", async () => {
    const result = await resolveArticleBody(
      item(),
      http({ "https://example.com/post": { ok: true, status: 200, text: "<html><body><p>短い</p></body></html>" } }),
    );
    expect(result).toEqual({
      body: "RSSの抜粋テキスト",
      bodyForStorage: null,
      fetchFailed: true,
    });
  });

  it("returns the full extracted text without capping at MAX_AI_BODY", async () => {
    // 6000字を超える本文を用意（MAX_AI_BODY=6000 を超過）
    const longPara = "これは長い記事の本文です。".repeat(800); // ≈ 11200字
    const longHtml = `<article><p>${longPara}</p></article>`;
    const result = await resolveArticleBody(
      item(),
      http({ "https://example.com/post": { ok: true, status: 200, text: longHtml } }),
    );
    expect(result.fetchFailed).toBe(false);
    expect(result.bodyForStorage).not.toBeNull();
    expect((result.bodyForStorage as string).length).toBeGreaterThan(6000);
  });
});
