/**
 * Server-Sent Events (text/event-stream) のフレームを順次 yield する低レベル parser。
 * フレームは空行で区切られ、行は `event:` または `data:` で始まる。
 * `[DONE]` のみの data を受け取った時点で終了する。malformed な行は無視する。
 */
export interface SseFrame {
  event: string;
  data: string;
}

export async function* parseSseFrames(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let event = "message";
  let data = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "") {
          if (data !== "") {
            if (data === "[DONE]") return;
            yield { event, data };
          }
          event = "message";
          data = "";
          continue;
        }
        if (trimmed.startsWith("event:")) {
          event = trimmed.slice(6).trim();
        } else if (trimmed.startsWith("data:")) {
          data = trimmed.slice(5).trim();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * SSE フレームを `{response: string | number}` JSON とみなして response テキストを取り出す。
 * Workers AI が単独数字トークンを number で返すケースに備えて文字列化する。
 * `event: error` フレームは Error として throw し、消費側 (`for await`) の catch に届ける。
 */
export async function* parseSseResponseChunks(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  for await (const frame of parseSseFrames(stream)) {
    if (frame.event === "error") {
      let message = frame.data;
      try {
        const obj = JSON.parse(frame.data) as { error?: unknown };
        if (typeof obj.error === "string") message = obj.error;
      } catch {
        // raw data をそのまま message にする
      }
      throw new Error(message);
    }
    try {
      const obj = JSON.parse(frame.data) as { response?: unknown };
      const r = obj.response;
      if (typeof r === "string") yield r;
      else if (typeof r === "number") yield String(r);
    } catch {
      // skip malformed line
    }
  }
}
