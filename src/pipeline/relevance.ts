// 一次関連性フィルタ: 安価なキーワード判定で明らかに無関係な記事を除外する。
// 最終判定は AI による二次関連性判定（フェーズ5）で行う。

// 単独で AI セキュリティと判断できる複合語
const STRONG_TERMS = [
  "prompt injection",
  "プロンプトインジェクション",
  "jailbreak",
  "ジェイルブレイク",
  "data poisoning",
  "データポイズニング",
  "model poisoning",
  "adversarial",
  "敵対的",
  "model theft",
  "model extraction",
  "モデル窃取",
  "llm security",
  "ai security",
  "aiセキュリティ",
];

const AI_TERMS = [
  "ai",
  "llm",
  "gpt",
  "genai",
  "generative",
  "machine learning",
  "neural",
  "chatbot",
  "rag",
  "人工知能",
  "機械学習",
  "大規模言語モデル",
  "生成ai",
  "ニューラル",
];

const SECURITY_TERMS = [
  "security",
  "vulnerability",
  "attack",
  "exploit",
  "threat",
  "malware",
  "breach",
  "cve",
  "injection",
  "セキュリティ",
  "脆弱性",
  "攻撃",
  "脅威",
  "悪用",
];

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * テキストが AI セキュリティに関連しそうかを判定する。
 * 強い複合語を含むか、AI 用語とセキュリティ用語の両方を含めば該当。
 */
export function isLikelyAiSecurity(text: string): boolean {
  const normalized = text.toLowerCase();
  if (includesAny(normalized, STRONG_TERMS)) return true;
  return (
    includesAny(normalized, AI_TERMS) && includesAny(normalized, SECURITY_TERMS)
  );
}
