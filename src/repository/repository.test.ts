import { describe, it, expect, beforeEach } from "vite-plus/test";
import { Repository } from "./repository";
import { createTestD1 } from "./d1-fake";
import type { D1Database } from "@cloudflare/workers-types";

let db: D1Database;
let repo: Repository;
let categoryId: number;
let labelId: number;

beforeEach(async () => {
  db = createTestD1();
  repo = new Repository(db);
  categoryId = await repo.getOrCreateCategory("セキュリティ", "security");
  labelId = await repo.getOrCreateLabel(categoryId, "プロンプトインジェクション");
});

const base = {
  guid: null as string | null,
  source: "Example",
  categoryId: 0,
  summary: "要約です",
  detail: "- 要点",
  originalLang: "en",
  publishedAt: "2026-06-15T00:00:00Z",
  fetchFailed: false,
  labelIds: [] as number[],
};

describe("Repository taxonomy", () => {
  it("reuses the seeded category instead of duplicating it", () => {
    expect(categoryId).toBe(1);
  });

  it("reuses an existing label by name", async () => {
    const again = await repo.getOrCreateLabel(categoryId, "プロンプトインジェクション");
    expect(again).toBe(labelId);
  });

  it("creates a new label with a generated slug", async () => {
    const id = await repo.getOrCreateLabel(categoryId, "新種の攻撃");
    expect(id).toBeGreaterThan(0);
    const names = await repo.listLabelNames(categoryId);
    expect(names).toContain("新種の攻撃");
  });
});

describe("Repository article persistence and dedup", () => {
  it("saves an article and links its labels", async () => {
    const id = await repo.saveArticle({
      ...base,
      url: "https://example.com/a",
      title: "プロンプトインジェクションの新手法",
      categoryId,
      labelIds: [labelId],
    });
    const dto = await repo.getArticle(id);
    expect(dto?.title).toBe("プロンプトインジェクションの新手法");
    expect(dto?.labels).toEqual([
      { name: "プロンプトインジェクション", slug: "prompt-injection" },
    ]);
    expect(dto?.category).toEqual({ name: "セキュリティ", slug: "security" });
  });

  it("reports existing dedup keys by url and guid", async () => {
    await repo.saveArticle({
      ...base,
      url: "https://example.com/a",
      guid: "guid-a",
      title: "t",
      categoryId,
    });
    const existing = await repo.listExistingKeys([
      "https://example.com/a",
      "guid-a",
      "https://example.com/new",
    ]);
    expect(existing.has("https://example.com/a")).toBe(true);
    expect(existing.has("guid-a")).toBe(true);
    expect(existing.has("https://example.com/new")).toBe(false);
  });

  it("checks a large set of dedup keys without exceeding SQL variable limits", async () => {
    await repo.saveArticle({
      ...base,
      url: "https://example.com/known",
      guid: "guid-known",
      title: "t",
      categoryId,
    });
    const keys = Array.from({ length: 250 }, (_, i) => `https://example.com/x${i}`);
    keys.push("https://example.com/known", "guid-known");
    const existing = await repo.listExistingKeys(keys);
    expect(existing.has("https://example.com/known")).toBe(true);
    expect(existing.has("guid-known")).toBe(true);
    expect(existing.has("https://example.com/x10")).toBe(false);
  });

  it("does not duplicate an article with the same url", async () => {
    const input = { ...base, url: "https://example.com/a", title: "t", categoryId };
    await repo.saveArticle(input);
    await repo.saveArticle(input);
    const { total } = await repo.listArticles({ page: 1, perPage: 20 });
    expect(total).toBe(1);
  });
});

describe("Repository listing, search and filters", () => {
  beforeEach(async () => {
    await repo.saveArticle({
      ...base,
      url: "https://example.com/1",
      title: "プロンプトインジェクション攻撃の解説",
      categoryId,
      labelIds: [labelId],
      publishedAt: "2026-06-17T00:00:00Z",
    });
    await repo.saveArticle({
      ...base,
      url: "https://example.com/2",
      title: "LLM のデータポイズニング",
      categoryId,
      publishedAt: "2026-06-16T00:00:00Z",
    });
    await repo.saveArticle({
      ...base,
      url: "https://example.com/3",
      title: "敵対的サンプルの研究",
      categoryId,
      publishedAt: "2026-06-15T00:00:00Z",
    });
  });

  it("lists articles newest-first with pagination", async () => {
    const result = await repo.listArticles({ page: 1, perPage: 2 });
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("プロンプトインジェクション攻撃の解説");
  });

  it("filters by label slug", async () => {
    const result = await repo.listArticles({
      labelSlug: "prompt-injection",
      page: 1,
      perPage: 20,
    });
    expect(result.total).toBe(1);
    expect(result.items[0].url).toBe("https://example.com/1");
  });

  it("full-text searches Japanese keywords via FTS5", async () => {
    const result = await repo.listArticles({
      q: "ポイズニング",
      page: 1,
      perPage: 20,
    });
    expect(result.total).toBe(1);
    expect(result.items[0].title).toBe("LLM のデータポイズニング");
  });

  it("lists labels with article counts", async () => {
    const labels = await repo.listLabels("security");
    const pi = labels.find((l) => l.slug === "prompt-injection");
    expect(pi?.count).toBe(1);
  });

  it("lists categories", async () => {
    expect(await repo.listCategories()).toEqual([
      { name: "セキュリティ", slug: "security" },
    ]);
  });
});
