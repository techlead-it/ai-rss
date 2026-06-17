import type { FeedItem } from "../types";
import type { HttpClient } from "../http";
import { parseFeed } from "./parse";

export interface FeedDef {
  /** ソース表示名 */
  source: string;
  /** フィード URL */
  url: string;
  /** 指定時、タイトル/抜粋がいずれかのキーワードを含む記事だけを採用（高ボリューム源の絞り込み） */
  keywords?: string[];
}

function matchesKeywords(item: FeedItem, keywords: string[]): boolean {
  const haystack = `${item.title} ${item.excerpt}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

/**
 * 複数フィードを取得・パースして記事メタを集約する。
 * フィード単位で失敗（例外・非ok応答）を分離し、他フィードの処理を継続する。
 */
export async function collectFeedItems(
  feeds: FeedDef[],
  http: HttpClient,
): Promise<FeedItem[]> {
  const all: FeedItem[] = [];
  for (const feed of feeds) {
    try {
      const res = await http.fetch(feed.url);
      if (!res.ok) continue;
      let items = parseFeed(res.text, feed.source);
      const keywords = feed.keywords;
      if (keywords && keywords.length > 0) {
        items = items.filter((it) => matchesKeywords(it, keywords));
      }
      all.push(...items);
    } catch {
      // 一時的な取得失敗はスキップして次フィードへ
      continue;
    }
  }
  return all;
}
