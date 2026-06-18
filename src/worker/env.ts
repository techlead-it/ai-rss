import type { Ai, D1Database, Fetcher } from "@cloudflare/workers-types";

/** Worker のバインディング。wrangler.jsonc の定義と対応する。 */
export interface Env {
  /** 静的アセット（ビルド済み React SPA）配信 */
  ASSETS: Fetcher;
  /** 記事・カテゴリ・ラベルを保持する D1 */
  DB: D1Database;
  /** 要約・分類に使う Workers AI */
  AI: Ai;
}
