// 収集パイプラインのドメイン型（I/O 非依存）

/** RSS/Atom フィードから抽出した 1 記事分のメタ情報 */
export interface FeedItem {
  /** 記事 URL（dedup の第一キー） */
  url: string;
  /** フィード上の GUID（url が無いフィードの dedup キー） */
  guid: string | null;
  /** ソース名（例: Simon Willison's Weblog） */
  source: string;
  title: string;
  /** RSS の description/summary（本文取得失敗時のフォールバック要約元） */
  excerpt: string;
  /** ISO8601 の公開日時。取得できなければ null */
  publishedAt: string | null;
}

/** AI による解析結果（要約・分類・関連性判定） */
export interface ArticleAnalysis {
  /** AI セキュリティ記事として妥当か（二次関連性判定） */
  relevant: boolean;
  /** 日本語の短い要約 */
  summary: string;
  /** 日本語の要点（箇条書き想定） */
  detail: string;
  /** 付与するラベル名（既存ラベルに寄せた表記） */
  labels: string[];
  /** 原文言語（例: en, ja）。不明なら null */
  originalLang: string | null;
}

/** 永続化済み記事をクライアントへ返す DTO */
export interface ArticleDto {
  id: number;
  title: string;
  source: string;
  url: string;
  category: TaxonomyRef;
  labels: TaxonomyRef[];
  summary: string;
  detail: string;
  publishedAt: string | null;
  fetchFailed: boolean;
}

/** カテゴリ/ラベルの表示名と slug の組 */
export interface TaxonomyRef {
  name: string;
  slug: string;
}

/** 記事件数付きのラベル */
export interface LabelWithCount extends TaxonomyRef {
  count: number;
}

/** データ取得元（フィード）と収集件数を表すリソース一覧用 DTO */
export interface SourceDto {
  /** ソース表示名（articles.source と一致） */
  source: string;
  /** フィード URL */
  url: string;
  /** 種別（専門/ベンダー/ニュース/研究 等） */
  kind: string;
  /** キーワードによる一次絞り込みを行っているか */
  filtered: boolean;
  /** これまでに収集できた記事数 */
  count: number;
}

/** 記事一覧 API のレスポンス */
export interface ArticleListResponse {
  items: ArticleDto[];
  page: number;
  perPage: number;
  total: number;
}
