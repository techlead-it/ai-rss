import type { Ai, D1Database, Fetcher } from "@cloudflare/workers-types";

/** Worker のバインディング。wrangler.jsonc の定義と対応する。 */
export interface Env {
  /** 静的アセット（ビルド済み React SPA）配信 */
  ASSETS: Fetcher;
  /** 記事・カテゴリ・ラベルを保持する D1 */
  DB: D1Database;
  /** 要約・分類に使う Workers AI */
  AI: Ai;
  /**
   * 検証用の手動トリガー (`POST /__run-collection?token=...`) を有効化するトークン。
   * 未設定なら同エンドポイントは 503 を返して無効化される。本番では
   * `wrangler secret put RUN_TOKEN` で設定する。
   */
  RUN_TOKEN?: string;
}
