import { describe, it, expect } from "vite-plus/test";
import { toArticleDto } from "./dto";

describe("toArticleDto", () => {
  const row = {
    id: 42,
    url: "https://example.com/a",
    source: "Simon Willison's Weblog",
    title: "記事タイトル",
    summary: "短い要約",
    detail: "要点の詳細",
    published_at: "2026-06-15T00:00:00Z",
    fetch_failed: 0,
  };
  const category = { name: "セキュリティ", slug: "security" };
  const labels = [{ name: "プロンプトインジェクション", slug: "prompt-injection" }];

  it("maps a row into the API DTO shape", () => {
    expect(toArticleDto(row, category, labels)).toEqual({
      id: 42,
      title: "記事タイトル",
      source: "Simon Willison's Weblog",
      url: "https://example.com/a",
      category: { name: "セキュリティ", slug: "security" },
      labels: [{ name: "プロンプトインジェクション", slug: "prompt-injection" }],
      summary: "短い要約",
      detail: "要点の詳細",
      publishedAt: "2026-06-15T00:00:00Z",
      fetchFailed: false,
    });
  });

  it("converts the fetch_failed flag to a boolean", () => {
    expect(toArticleDto({ ...row, fetch_failed: 1 }, category, []).fetchFailed).toBe(
      true,
    );
  });
});
