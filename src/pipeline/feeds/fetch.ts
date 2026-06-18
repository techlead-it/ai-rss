import type { FeedItem } from "../types";
import type { HttpClient } from "../http";
import { parseFeed } from "./parse";
import { matchesAnyKeyword } from "../keywords";

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
  return matchesAnyKeyword(`${item.title} ${item.excerpt}`, keywords);
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

const MAX_CONCURRENT_FETCHES = 6;

type FeedFetchOutcome =
  | { kind: "ok"; items: FeedItem[] }
  | { kind: "fail"; failure: FeedFailure };

async function fetchOneFeed(
  feed: FeedDef,
  http: HttpClient,
): Promise<FeedFetchOutcome> {
  try {
    const res = await http.fetch(feed.url);
    if (!res.ok) {
      return {
        kind: "fail",
        failure: { source: feed.source, reason: `HTTP ${res.status}` },
      };
    }
    let parsed = parseFeed(res.text, feed.source);
    const keywords = feed.keywords;
    if (keywords && keywords.length > 0) {
      parsed = parsed.filter((it) => matchesKeywords(it, keywords));
    }
    return { kind: "ok", items: parsed };
  } catch (err) {
    return {
      kind: "fail",
      failure: {
        source: feed.source,
        reason: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * 複数フィードを取得・パースして記事メタを集約する。
 * 並列度 MAX_CONCURRENT_FETCHES でチャンク分割し、フィード単位で失敗
 * （例外・非ok応答）を分離して failures に記録する。
 * 戻り値の items はチャンク順を保ち、ラウンドロビン採用の挙動を再現可能にする。
 */
export async function collectFeedItems(
  feeds: FeedDef[],
  http: HttpClient,
): Promise<FeedCollectionResult> {
  const items: FeedItem[] = [];
  const failures: FeedFailure[] = [];
  for (let i = 0; i < feeds.length; i += MAX_CONCURRENT_FETCHES) {
    const chunk = feeds.slice(i, i + MAX_CONCURRENT_FETCHES);
    const outcomes = await Promise.all(
      chunk.map((feed) => fetchOneFeed(feed, http)),
    );
    for (const outcome of outcomes) {
      if (outcome.kind === "ok") items.push(...outcome.items);
      else failures.push(outcome.failure);
    }
  }
  return { items, failures };
}
