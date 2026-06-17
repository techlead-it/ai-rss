import type { FeedItem } from "../types";
import type { HttpClient } from "../http";
import { parseFeed } from "./parse";

export interface FeedDef {
  /** ソース表示名 */
  source: string;
  /** フィード URL */
  url: string;
  /** 種別（リソース一覧画面での分類表示用。例: 専門/ベンダー/ニュース/研究） */
  kind?: string;
  /** 指定時、タイトル/抜粋がいずれかのキーワードを含む記事だけを採用（高ボリューム源の絞り込み） */
  keywords?: string[];
}

function matchesKeywords(item: FeedItem, keywords: string[]): boolean {
  const haystack = `${item.title} ${item.excerpt}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

export interface FeedFailure {
  source: string;
  /** HTTP ステータス or 例外メッセージ */
  reason: string;
}

export interface FeedCollectionResult {
  items: FeedItem[];
  failures: FeedFailure[];
}

/**
 * 複数フィードを取得・パースして記事メタを集約する。
 * フィード単位で失敗（例外・非ok応答）を分離し、他フィードの処理を継続する。
 * 失敗したフィードは failures に記録され、呼び出し側で観測ログ等に利用できる。
 */
export async function collectFeedItems(
  feeds: FeedDef[],
  http: HttpClient,
): Promise<FeedCollectionResult> {
  const items: FeedItem[] = [];
  const failures: FeedFailure[] = [];
  for (const feed of feeds) {
    try {
      const res = await http.fetch(feed.url);
      if (!res.ok) {
        failures.push({ source: feed.source, reason: `HTTP ${res.status}` });
        continue;
      }
      let parsed = parseFeed(res.text, feed.source);
      const keywords = feed.keywords;
      if (keywords && keywords.length > 0) {
        parsed = parsed.filter((it) => matchesKeywords(it, keywords));
      }
      items.push(...parsed);
    } catch (err) {
      failures.push({
        source: feed.source,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { items, failures };
}
