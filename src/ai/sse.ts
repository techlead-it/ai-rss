/**
 * Server-Sent Events (text/event-stream) の data 行を順次 yield する低レベル parser。
 * Workers AI 形式 (`data: {"response":"..."}\n\n` / `data: [DONE]\n\n`) と
 * 自前 API の SSE をどちらも扱える共通実装。
 *
 * `[DONE]` を受け取った時点で終了する。malformed な行は無視する。
 */
export async function* parseSseDataLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * SSE の data 行を `{response: string | number}` JSON とみなして response テキストを取り出す。
 * Workers AI が単独数字トークンを number で返すケースに備えて文字列化する。
 */
export async function* parseSseResponseChunks(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  for await (const payload of parseSseDataLines(stream)) {
    try {
      const obj = JSON.parse(payload) as { response?: unknown };
      const r = obj.response;
      if (typeof r === "string") yield r;
      else if (typeof r === "number") yield String(r);
    } catch {
      // skip malformed line
    }
  }
}
