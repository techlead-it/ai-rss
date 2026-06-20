import type {
  ArticleDto,
  ArticleListResponse,
  LabelWithCount,
  SourceDto,
  TaxonomyRef,
} from "../../pipeline/types";
import type { ChatMessage } from "../../ai/chat";
import { parseSseResponseChunks } from "../../ai/sse";

export type { ChatMessage };

export interface ListParams {
  category?: string;
  label?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

/** SPA から API を叩くためのデータソース抽象（テストではフェイクを注入）。 */
export interface ApiClient {
  listArticles(
    params: ListParams,
    signal?: AbortSignal,
  ): Promise<ArticleListResponse>;
  getArticle(id: number): Promise<ArticleDto | null>;
  listLabels(category?: string): Promise<LabelWithCount[]>;
  listCategories(): Promise<TaxonomyRef[]>;
  listSources(): Promise<SourceDto[]>;
  /** POST /api/articles/:id/chat に SSE で接続し、回答テキストを順次 yield する。 */
  chatWithArticle(
    id: number,
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}

function queryString(
  params: Record<string, string | number | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

/** 同一 Worker の /api/* を叩く本番実装。 */
export const httpApiClient: ApiClient = {
  listArticles(params, signal) {
    return getJson<ArticleListResponse>(
      `/api/articles${queryString({
        category: params.category,
        label: params.label,
        q: params.q,
        page: params.page,
        perPage: params.perPage,
      })}`,
      signal,
    );
  },
  async getArticle(id) {
    const res = await fetch(`/api/articles/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`request failed (${res.status})`);
    return (await res.json()) as ArticleDto;
  },
  listLabels(category) {
    return getJson<LabelWithCount[]>(`/api/labels${queryString({ category })}`);
  },
  listCategories() {
    return getJson<TaxonomyRef[]>("/api/categories");
  },
  listSources() {
    return getJson<SourceDto[]>("/api/sources");
  },
  chatWithArticle(id, messages, signal) {
    return chatStream(id, messages, signal);
  },
};

async function* chatStream(
  id: number,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncIterable<string> {
  const res = await fetch(`/api/articles/${id}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`chat failed (${res.status})`);
  }
  yield* parseSseResponseChunks(res.body);
}
