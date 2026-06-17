import type { D1Database } from "@cloudflare/workers-types";
import type { ArticleDto, TaxonomyRef } from "../pipeline/types";
import { toArticleDto, type ArticleRow } from "../pipeline/dto";
import { slugify } from "../pipeline/labels";

type Param = string | number | null;

export interface SaveArticleInput {
  url: string;
  guid: string | null;
  source: string;
  title: string;
  categoryId: number;
  summary: string;
  detail: string;
  originalLang: string | null;
  publishedAt: string | null;
  fetchFailed: boolean;
  labelIds: number[];
}

export interface ListQuery {
  categorySlug?: string;
  labelSlug?: string;
  q?: string;
  page: number;
  perPage: number;
}

export interface ListResult {
  items: ArticleDto[];
  page: number;
  perPage: number;
  total: number;
}

export interface LabelWithCount extends TaxonomyRef {
  count: number;
}

interface ArticleRecord extends ArticleRow {
  category_id: number;
}

const ARTICLE_COLUMNS =
  "id, url, source, title, summary, detail, published_at, fetch_failed, category_id";

export class Repository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async getOrCreateCategory(name: string, slug: string): Promise<number> {
    const existing = await this.db
      .prepare("SELECT id FROM categories WHERE slug = ?")
      .bind(slug)
      .first<{ id: number }>();
    if (existing) return existing.id;
    const res = await this.db
      .prepare("INSERT INTO categories (name, slug) VALUES (?, ?)")
      .bind(name, slug)
      .run();
    return Number(res.meta.last_row_id);
  }

  async getOrCreateLabel(categoryId: number, name: string): Promise<number> {
    const existing = await this.db
      .prepare("SELECT id FROM labels WHERE category_id = ? AND name = ?")
      .bind(categoryId, name)
      .first<{ id: number }>();
    if (existing) return existing.id;
    const res = await this.db
      .prepare(
        "INSERT INTO labels (category_id, name, slug) VALUES (?, ?, ?) ON CONFLICT (category_id, name) DO NOTHING",
      )
      .bind(categoryId, name, slugify(name))
      .run();
    const id = Number(res.meta.last_row_id);
    if (id > 0) return id;
    const row = await this.db
      .prepare("SELECT id FROM labels WHERE category_id = ? AND name = ?")
      .bind(categoryId, name)
      .first<{ id: number }>();
    return row?.id ?? 0;
  }

  async listLabelNames(categoryId: number): Promise<string[]> {
    const { results } = await this.db
      .prepare("SELECT name FROM labels WHERE category_id = ? ORDER BY id")
      .bind(categoryId)
      .all<{ name: string }>();
    return results.map((r) => r.name);
  }

  async listExistingKeys(keys: string[]): Promise<Set<string>> {
    const present = new Set<string>();
    if (keys.length === 0) return present;
    const placeholders = keys.map(() => "?").join(", ");
    const { results } = await this.db
      .prepare(
        `SELECT url, guid FROM articles WHERE url IN (${placeholders}) OR guid IN (${placeholders})`,
      )
      .bind(...keys, ...keys)
      .all<{ url: string; guid: string | null }>();
    for (const row of results) {
      present.add(row.url);
      if (row.guid) present.add(row.guid);
    }
    return present;
  }

  async saveArticle(input: SaveArticleInput): Promise<number> {
    const fetchedAt = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO articles
           (url, guid, source, title, category_id, summary, detail, original_lang, published_at, fetched_at, fetch_failed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (url) DO NOTHING`,
      )
      .bind(
        input.url,
        input.guid,
        input.source,
        input.title,
        input.categoryId,
        input.summary,
        input.detail,
        input.originalLang,
        input.publishedAt,
        fetchedAt,
        input.fetchFailed ? 1 : 0,
      )
      .run();

    const row = await this.db
      .prepare("SELECT id FROM articles WHERE url = ?")
      .bind(input.url)
      .first<{ id: number }>();
    const articleId = row?.id ?? 0;

    for (const labelId of input.labelIds) {
      await this.db
        .prepare(
          "INSERT INTO article_labels (article_id, label_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        )
        .bind(articleId, labelId)
        .run();
    }
    return articleId;
  }

  async getArticle(id: number): Promise<ArticleDto | null> {
    const row = await this.db
      .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE id = ?`)
      .bind(id)
      .first<ArticleRecord>();
    if (!row) return null;
    const [labels, categories] = await Promise.all([
      this.loadLabelsFor([id]),
      this.categoryMap(),
    ]);
    return toArticleDto(
      row,
      categories.get(row.category_id) ?? { name: "", slug: "" },
      labels.get(id) ?? [],
    );
  }

  async listArticles(query: ListQuery): Promise<ListResult> {
    const where: string[] = [];
    const params: Param[] = [];

    if (query.categorySlug) {
      where.push("a.category_id = (SELECT id FROM categories WHERE slug = ?)");
      params.push(query.categorySlug);
    }
    if (query.labelSlug) {
      where.push(
        "a.id IN (SELECT al.article_id FROM article_labels al JOIN labels l ON l.id = al.label_id WHERE l.slug = ?)",
      );
      params.push(query.labelSlug);
    }
    const term = query.q?.trim();
    if (term) {
      if (term.length >= 3) {
        where.push(
          "a.id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?)",
        );
        params.push(`"${term.replace(/"/g, '""')}"`);
      } else {
        where.push("(a.title LIKE ? OR a.summary LIKE ? OR a.detail LIKE ?)");
        const like = `%${term}%`;
        params.push(like, like, like);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const totalRow = await this.db
      .prepare(`SELECT COUNT(*) AS c FROM articles a ${whereSql}`)
      .bind(...params)
      .first<{ c: number }>();
    const total = totalRow?.c ?? 0;

    const offset = (query.page - 1) * query.perPage;
    const { results } = await this.db
      .prepare(
        `SELECT ${ARTICLE_COLUMNS} FROM articles a ${whereSql}
         ORDER BY a.published_at DESC, a.id DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, query.perPage, offset)
      .all<ArticleRecord>();

    const ids = results.map((r) => r.id);
    const [labels, categories] = await Promise.all([
      this.loadLabelsFor(ids),
      this.categoryMap(),
    ]);
    const items = results.map((row) =>
      toArticleDto(
        row,
        categories.get(row.category_id) ?? { name: "", slug: "" },
        labels.get(row.id) ?? [],
      ),
    );
    return { items, page: query.page, perPage: query.perPage, total };
  }

  async listCategories(): Promise<TaxonomyRef[]> {
    const { results } = await this.db
      .prepare("SELECT name, slug FROM categories ORDER BY id")
      .all<TaxonomyRef>();
    return results;
  }

  async listLabels(categorySlug?: string): Promise<LabelWithCount[]> {
    const where = categorySlug
      ? "WHERE l.category_id = (SELECT id FROM categories WHERE slug = ?)"
      : "";
    const stmt = this.db.prepare(
      `SELECT l.name, l.slug, COUNT(al.article_id) AS count
         FROM labels l
         LEFT JOIN article_labels al ON al.label_id = l.id
         ${where}
         GROUP BY l.id ORDER BY l.id`,
    );
    const bound = categorySlug ? stmt.bind(categorySlug) : stmt;
    const { results } = await bound.all<LabelWithCount>();
    return results;
  }

  private async categoryMap(): Promise<Map<number, TaxonomyRef>> {
    const { results } = await this.db
      .prepare("SELECT id, name, slug FROM categories")
      .all<{ id: number; name: string; slug: string }>();
    return new Map(results.map((r) => [r.id, { name: r.name, slug: r.slug }]));
  }

  private async loadLabelsFor(
    articleIds: number[],
  ): Promise<Map<number, TaxonomyRef[]>> {
    const map = new Map<number, TaxonomyRef[]>();
    if (articleIds.length === 0) return map;
    const placeholders = articleIds.map(() => "?").join(", ");
    const { results } = await this.db
      .prepare(
        `SELECT al.article_id AS articleId, l.name, l.slug
           FROM article_labels al JOIN labels l ON l.id = al.label_id
           WHERE al.article_id IN (${placeholders})
           ORDER BY l.id`,
      )
      .bind(...articleIds)
      .all<{ articleId: number; name: string; slug: string }>();
    for (const row of results) {
      const list = map.get(row.articleId) ?? [];
      list.push({ name: row.name, slug: row.slug });
      map.set(row.articleId, list);
    }
    return map;
  }
}
