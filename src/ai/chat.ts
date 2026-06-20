import type { Ai } from "@cloudflare/workers-types";
import { parseSseResponseChunks } from "./sse";

/** 記事チャットに使う Workers AI モデル（解析用と共通）。 */
export const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatArticle {
  title: string;
  body: string;
}

/**
 * 記事 context つきチャットの抽象境界。
 * 記事 body を context にしてユーザの質問に応答し、テキストチャンクを順次 yield する。
 */
export interface ChatEngine {
  stream(
    article: ChatArticle,
    messages: ChatMessage[],
  ): AsyncIterable<string>;
}

const SYSTEM_INSTRUCTION =
  "あなたはAIセキュリティに詳しい日本語アシスタントです。\n" +
  "ユーザーが読んでいる記事に関する質問に、与えられた記事本文の内容に基づいて日本語で回答してください。\n" +
  "記事に書かれていないことを尋ねられた場合は、推測せずに「記事には記載がありません」と伝えてください。";

function buildSystemMessage(article: ChatArticle): string {
  return `${SYSTEM_INSTRUCTION}

---記事タイトル---
${article.title}

---記事本文---
${article.body}`;
}

export function createWorkersAiChatEngine(
  ai: Ai,
  model = CHAT_MODEL,
): ChatEngine {
  return {
    async *stream(article, userMessages) {
      const raw = (await ai.run(model, {
        messages: [
          { role: "system", content: buildSystemMessage(article) },
          ...userMessages,
        ],
        stream: true,
      })) as unknown as ReadableStream<Uint8Array>;
      yield* parseSseResponseChunks(raw);
    },
  };
}

export function createFakeChatEngine(chunks: string[]): ChatEngine {
  return {
    async *stream() {
      for (const c of chunks) yield c;
    },
  };
}
