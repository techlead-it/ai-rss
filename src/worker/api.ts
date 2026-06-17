import type { Repository } from "../repository/repository";
import type { FeedDef } from "../pipeline/feeds/fetch";
import type { SourceDto } from "../pipeline/types";

export interface ApiResponse {
  status: number;
  body: unknown;
}

/** フィード定義と収集件数をマージしてリソース一覧用 DTO を組み立てる。 */
export function buildSourceList(
  feeds: FeedDef[],
  counts: { source: string; count: number }[],
): SourceDto[] {
  const countBySource = new Map(counts.map((c) => [c.source, c.count]));
  return feeds.map((feed) => ({
    source: feed.source,
    url: feed.url,
    kind: feed.kind ?? "その他",
    filtered: Boolean(feed.keywords && feed.keywords.length > 0),
    count: countBySource.get(feed.source) ?? 0,
  }));
}

const MAX_PER_PAGE = 50;
const DEFAULT_PER_PAGE = 20;

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseListQuery(params: URLSearchParams) {
  const q = params.get("q")?.trim();
  return {
    categorySlug: params.get("category") ?? undefined,
    labelSlug: params.get("label") ?? undefined,
    q: q ? q : undefined,
    page: clampInt(params.get("page"), 1, 1, Number.MAX_SAFE_INTEGER),
    perPage: clampInt(params.get("perPage"), DEFAULT_PER_PAGE, 1, MAX_PER_PAGE),
  };
}

/**
 * /api/* をルーティングしてレスポンスデータを返す。
 * /api/* 以外のパスでは null を返し、呼び出し側が SPA を配信する。
 */
export async function routeApi(
  method: string,
  pathname: string,
  params: URLSearchParams,
  repo: Repository,
  feeds: FeedDef[],
): Promise<ApiResponse | null> {
  if (!pathname.startsWith("/api/")) return null;
  if (method !== "GET") {
    return { status: 405, body: { error: "method not allowed" } };
  }

  const segments = pathname.split("/").filter(Boolean); // ["api", ...]

  if (segments[1] === "articles" && segments.length === 2) {
    const result = await repo.listArticles(parseListQuery(params));
    return { status: 200, body: result };
  }

  if (segments[1] === "articles" && segments.length === 3) {
    const id = Number.parseInt(segments[2], 10);
    if (Number.isNaN(id)) return { status: 404, body: { error: "not found" } };
    const article = await repo.getArticle(id);
    if (!article) return { status: 404, body: { error: "not found" } };
    return { status: 200, body: article };
  }

  if (segments[1] === "labels" && segments.length === 2) {
    const category = params.get("category") ?? undefined;
    return { status: 200, body: await repo.listLabels(category) };
  }

  if (segments[1] === "categories" && segments.length === 2) {
    return { status: 200, body: await repo.listCategories() };
  }

  if (segments[1] === "sources" && segments.length === 2) {
    const counts = await repo.countArticlesBySource();
    return { status: 200, body: buildSourceList(feeds, counts) };
  }

  return { status: 404, body: { error: "not found" } };
}
