// HTTP 取得の抽象境界。テストではフェイクを注入し、実行時は global fetch を使う。

export interface FetchResponse {
  ok: boolean;
  status: number;
  text: string;
}

export interface HttpClient {
  fetch(url: string): Promise<FetchResponse>;
}

const USER_AGENT = "ai-security-news-bot/1.0 (+https://github.com/techlead-it/ai-security-news)";

/** global fetch を使う本番実装。 */
export const httpClient: HttpClient = {
  async fetch(url: string): Promise<FetchResponse> {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      redirect: "follow",
    });
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text };
  },
};
