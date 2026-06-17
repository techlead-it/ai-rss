import type { ArticleDto, TaxonomyRef } from "./types";

/** DTO 整形が必要とする記事の行データ */
export interface ArticleRow {
  id: number;
  url: string;
  source: string;
  title: string;
  summary: string;
  detail: string;
  published_at: string | null;
  fetch_failed: number;
}

/** 記事行・カテゴリ・ラベルから API レスポンス用 DTO を組み立てる。 */
export function toArticleDto(
  row: ArticleRow,
  category: TaxonomyRef,
  labels: TaxonomyRef[],
): ArticleDto {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    url: row.url,
    category,
    labels,
    summary: row.summary,
    detail: row.detail,
    publishedAt: row.published_at,
    fetchFailed: row.fetch_failed !== 0,
  };
}
