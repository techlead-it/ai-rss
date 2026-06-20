import { describe, it, expect, beforeEach } from "vite-plus/test";
import { Repository } from "../repository/repository";
import { createTestD1 } from "../repository/d1-fake";
import { createFakeChatEngine } from "../ai/chat";
import { handleChatRequest } from "./chat";

let repo: Repository;
let articleId: number;

beforeEach(async () => {
  repo = new Repository(createTestD1());
  const categoryId = await repo.getOrCreateCategory("セキュリティ", "security");
  articleId = await repo.saveArticle({
    url: "https://example.com/1",
    guid: null,
    source: "Test",
    title: "プロンプトインジェクション解説",
    categoryId,
    summary: "s",
    detail: "d",
    originalLang: "ja",
    publishedAt: "2026-06-17T00:00:00Z",
    fetchFailed: false,
    labelIds: [],
    body: "本文です",
  });
});

function makeRequest(body: unknown): Request {
  return new Request("https://x/api/articles/1/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("handleChatRequest", () => {
  it("streams chat chunks as SSE data events terminated by [DONE]", async () => {
    const res = await handleChatRequest(
      makeRequest({ messages: [{ role: "user", content: "教えて" }] }),
      articleId,
      repo,
      createFakeChatEngine(["こん", "にちは"]),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");
    const text = await res.text();
    expect(text).toContain('data: {"response":"こん"}');
    expect(text).toContain('data: {"response":"にちは"}');
    expect(text).toContain("data: [DONE]");
  });

  it("returns 404 when the article does not exist", async () => {
    const res = await handleChatRequest(
      makeRequest({ messages: [{ role: "user", content: "q" }] }),
      999,
      repo,
      createFakeChatEngine([]),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when messages is missing", async () => {
    const res = await handleChatRequest(
      makeRequest({}),
      articleId,
      repo,
      createFakeChatEngine([]),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when messages array is empty", async () => {
    const res = await handleChatRequest(
      makeRequest({ messages: [] }),
      articleId,
      repo,
      createFakeChatEngine([]),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when a message has an invalid role", async () => {
    const res = await handleChatRequest(
      makeRequest({ messages: [{ role: "system", content: "x" }] }),
      articleId,
      repo,
      createFakeChatEngine([]),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const res = await handleChatRequest(
      makeRequest("not json"),
      articleId,
      repo,
      createFakeChatEngine([]),
    );
    expect(res.status).toBe(400);
  });
});
