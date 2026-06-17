import type { FeedItem } from "./types";
import type { HttpClient } from "./http";
import { htmlToText } from "./text";

// AI 入力と CPU を抑えるための本文長の上限・最小しきい値
const MAX_BODY = 6000;
const MIN_BODY = 200;

function stripChrome(html: string): string {
  return html
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");
}

function mainRegion(html: string): string {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article) return article[1];
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  return html;
}

/** HTML から記事本文のプレーンテキストを抽出する（軽量・上限付き）。 */
export function extractArticleText(html: string): string {
  const text = htmlToText(stripChrome(mainRegion(html)));
  return text.length > MAX_BODY ? text.slice(0, MAX_BODY) : text;
}

export interface ResolvedBody {
  /** 要約に渡す本文（取得成功時は抽出本文、失敗時は RSS 抜粋） */
  body: string;
  /** 本文取得に失敗し RSS 抜粋で代替したか */
  fetchFailed: boolean;
}

/**
 * 記事本文を取得・抽出する。取得失敗・到達不可・本文が薄い場合は
 * RSS 抜粋で代替し `fetchFailed=true` を立てる。
 */
export async function resolveArticleBody(
  item: FeedItem,
  http: HttpClient,
): Promise<ResolvedBody> {
  try {
    const res = await http.fetch(item.url);
    if (res.ok) {
      const body = extractArticleText(res.text);
      if (body.length >= MIN_BODY) return { body, fetchFailed: false };
    }
  } catch {
    // ネットワークエラーはフォールバックへ
  }
  return { body: item.excerpt, fetchFailed: true };
}
