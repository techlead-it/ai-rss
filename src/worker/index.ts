import type { ExportedHandler } from "@cloudflare/workers-types";
import type { Env } from "./env";

// API ルーティング・収集パイプラインの結線は後続フェーズで追加する。
// 現時点では静的アセット配信のみを担う。
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, _env, _ctx) {
    // 収集パイプラインはフェーズ7で結線する
  },
} satisfies ExportedHandler<Env>;
