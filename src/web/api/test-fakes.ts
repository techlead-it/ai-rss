import type { ApiClient } from "./client";

/**
 * テストで `ApiClient` を満たす最小の fake を作るためのヘルパ。
 * デフォルトは全メソッド「空」を返す。テストごとに `overrides` で必要な振る舞いだけ差し替える。
 * ApiClient にメソッドが増えたら、このファイルだけ更新すればよい（呼び出し側の修正不要）。
 */
export function createFakeApiClient(
  overrides: Partial<ApiClient> = {},
): ApiClient {
  return {
    listArticles: async () => ({ items: [], page: 1, perPage: 10, total: 0 }),
    getArticle: async () => null,
    listLabels: async () => [],
    listCategories: async () => [],
    listSources: async () => [],
    chatWithArticle: async function* () {},
    ...overrides,
  };
}
