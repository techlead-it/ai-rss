import type {
  ExportedHandler,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { Env } from "./env";
import { runCollection } from "../pipeline/collect";
import { FEEDS } from "../pipeline/feeds/definitions";
import { httpClient } from "../pipeline/http";
import { createWorkersAiEngine } from "../ai/workers-ai";
import { Repository } from "../repository/repository";
import { routeApi } from "./api";
import { handleTrigger } from "./trigger";

function startCollection(env: Env): Promise<unknown> {
  return runCollection({
    feeds: FEEDS,
    http: httpClient,
    ai: createWorkersAiEngine(env.AI),
    repo: new Repository(env.DB),
    logger: (message) => console.log(message),
  });
}

// Worker は API(/api/*) と静的アセット(SPA) 配信、Cron 収集の起動を担う。
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 検証用の手動トリガー。RUN_TOKEN が設定されているときのみ有効化。
    if (request.method === "POST" && url.pathname === "/__run-collection") {
      const result = handleTrigger({
        expectedToken: env.RUN_TOKEN,
        providedToken: url.searchParams.get("token"),
        trigger: () => ctx.waitUntil(startCollection(env)),
      });
      return new Response(result.body, {
        status: result.status,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }) as unknown as CfResponse;
    }

    const result = await routeApi(
      request.method,
      url.pathname,
      url.searchParams,
      new Repository(env.DB),
      FEEDS,
    );
    if (result) {
      // global の Response(DOM 型) を Worker の CF Response 型へ橋渡しする
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { "content-type": "application/json; charset=utf-8" },
      }) as unknown as CfResponse;
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env) {
    await startCollection(env);
  },
} satisfies ExportedHandler<Env>;
