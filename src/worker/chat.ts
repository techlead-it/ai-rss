import type { Repository } from "../repository/repository";
import type { ChatEngine, ChatMessage } from "../ai/chat";

interface ChatRequestBody {
  messages: ChatMessage[];
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validateBody(payload: unknown): ChatRequestBody | null {
  if (!payload || typeof payload !== "object") return null;
  const { messages } = payload as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const valid: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    valid.push({ role, content });
  }
  return { messages: valid };
}

/**
 * POST /api/articles/:id/chat の本体。
 * 記事 body を context として ChatEngine.stream を呼び、結果を text/event-stream で配信する。
 * 各チャンクは `data: {"response":"..."}\n\n` 形式で、末尾に `data: [DONE]\n\n` を送る。
 */
export async function handleChatRequest(
  request: Request,
  articleId: number,
  repo: Repository,
  engine: ChatEngine,
): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid json body");
  }
  const body = validateBody(payload);
  if (!body) return jsonError(400, "messages required");

  const article = await repo.getArticleForChat(articleId);
  if (!article) return jsonError(404, "article not found");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of engine.stream(article, body.messages)) {
          if (!chunk) continue;
          const json = JSON.stringify({ response: chunk });
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const json = JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        });
        controller.enqueue(encoder.encode(`event: error\ndata: ${json}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
    },
  });
}
