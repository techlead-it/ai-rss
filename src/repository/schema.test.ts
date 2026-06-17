import { describe, it, expect } from "vite-plus/test";
import { createTestD1 } from "./d1-fake";

describe("D1 schema and seed", () => {
  it("creates the security category on migration", async () => {
    const db = createTestD1();
    const row = await db
      .prepare("SELECT name, slug FROM categories WHERE slug = ?")
      .bind("security")
      .first<{ name: string; slug: string }>();
    expect(row).toEqual({ name: "セキュリティ", slug: "security" });
  });

  it("seeds the initial security labels", async () => {
    const db = createTestD1();
    const { results } = await db
      .prepare(
        "SELECT name, slug FROM labels ORDER BY id",
      )
      .all<{ name: string; slug: string }>();
    expect(results).toContainEqual({
      name: "プロンプトインジェクション",
      slug: "prompt-injection",
    });
    expect(results).toHaveLength(8);
  });

  it("supports Japanese substring full-text search via the FTS5 trigram index", async () => {
    const db = createTestD1();
    await db
      .prepare(
        "INSERT INTO articles (url, source, title, category_id, summary, detail, fetched_at) VALUES (?, ?, ?, 1, ?, ?, ?)",
      )
      .bind(
        "https://example.com/a",
        "Example",
        "新手のプロンプトインジェクション攻撃",
        "LLM への新しい攻撃手法の要約",
        "詳細な要点",
        "2026-06-18T00:00:00Z",
      )
      .run();

    const { results } = await db
      .prepare(
        "SELECT a.title FROM articles_fts f JOIN articles a ON a.id = f.rowid WHERE articles_fts MATCH ?",
      )
      .bind("インジェクション")
      .all<{ title: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("新手のプロンプトインジェクション攻撃");
  });
});
