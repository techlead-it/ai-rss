import { describe, it, expect } from "vite-plus/test";
import { parseSseResponseChunks } from "./sse";

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function collect(iter: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const c of iter) out.push(c);
  return out;
}

describe("parseSseResponseChunks", () => {
  it("throws when the stream contains an event: error frame", async () => {
    const stream = sseStream([
      'data: {"response":"OK"}\n\n',
      'event: error\ndata: {"error":"upstream failed"}\n\n',
    ]);
    await expect(collect(parseSseResponseChunks(stream))).rejects.toThrow(
      /upstream failed/,
    );
  });

  it("falls back to a generic message when the error frame data is not JSON", async () => {
    const stream = sseStream(["event: error\ndata: oops\n\n"]);
    await expect(collect(parseSseResponseChunks(stream))).rejects.toThrow(
      /oops/,
    );
  });
});
