import type { FeedDef } from "./fetch";

// 高ボリュームな一般セキュリティニュース源を AI 関連に絞るためのキーワード
const AI_KEYWORDS = [
  "ai",
  "llm",
  "gpt",
  "genai",
  "generative",
  "machine learning",
  "chatbot",
  "openai",
  "anthropic",
  "copilot",
  "人工知能",
  "生成ai",
];

// arXiv cs.CR を LLM/プロンプト系に絞るためのキーワード
const ARXIV_LLM_KEYWORDS = [
  "llm",
  "large language model",
  "language model",
  "prompt",
  "gpt",
  "jailbreak",
  "ai agent",
  "agentic",
  "diffusion",
];

/**
 * 対象 RSS フィード一覧（到達性は 2026-06-18 時点で確認済み）。
 * 専門ブログは全件採用し、ニュース/arXiv はキーワードで一次絞り込みする。
 * 最終的な AI セキュリティ判定はパイプラインの一次/二次関連性フィルタが行う。
 */
export const FEEDS: FeedDef[] = [
  // 専門（AI セキュリティ中心）
  { source: "Simon Willison's Weblog", url: "https://simonwillison.net/atom/everything/" },
  { source: "Embrace The Red", url: "https://embracethered.com/blog/index.xml" },
  { source: "Trail of Bits", url: "https://blog.trailofbits.com/index.xml" },
  // ベンダー・標準
  {
    source: "Google Security Blog",
    url: "https://feeds.feedburner.com/GoogleOnlineSecurityBlog",
  },
  // ニュース（AI 関連に絞り込み）
  {
    source: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    keywords: AI_KEYWORDS,
  },
  {
    source: "BleepingComputer",
    url: "https://www.bleepingcomputer.com/feed/",
    keywords: AI_KEYWORDS,
  },
  {
    source: "Dark Reading",
    url: "https://www.darkreading.com/rss.xml",
    keywords: AI_KEYWORDS,
  },
  // 研究（LLM/プロンプト系に絞り込み）
  {
    source: "arXiv cs.CR",
    url: "https://export.arxiv.org/rss/cs.CR",
    keywords: ARXIV_LLM_KEYWORDS,
  },
];
