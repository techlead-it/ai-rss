import type { ExportedHandler } from "@cloudflare/workers-types";
import type { Env } from "./env";
import { runCollection } from "../pipeline/collect";
import { FEEDS } from "../pipeline/feeds/definitions";
import { httpClient } from "../pipeline/http";
import { createWorkersAiEngine } from "../ai/workers-ai";
import { Repository } from "../repository/repository";

// API ルーティングは後続フェーズで追加する。現時点では静的アセット配信と
// Cron による収集パイプライン起動を担う。
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env) {
    await runCollection({
      feeds: FEEDS,
      http: httpClient,
      ai: createWorkersAiEngine(env.AI),
      repo: new Repository(env.DB),
      logger: (message) => console.log(message),
    });
  },
} satisfies ExportedHandler<Env>;
