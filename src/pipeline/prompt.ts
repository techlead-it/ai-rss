// AI 解析プロンプトの組立（I/O 非依存）。
// 1 回の呼び出しで「AI セキュリティ関連性の二次判定・日本語要約/詳細・ラベル分類」を行わせる。

export interface AnalysisPromptInput {
  title: string;
  /** 本文（取得成功時）または RSS 抜粋（フォールバック時） */
  body: string;
  source: string;
  /** 既存ラベル一覧（表記揺れ防止のため候補として提示） */
  existingLabels: string[];
}

export interface AnalysisPrompt {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = [
  "あなたは AI セキュリティ分野の専門エディターです。",
  "与えられた記事を分析し、次の JSON だけを出力してください（前後に文章を付けない）。",
  "{",
  '  "relevant": boolean,   // AI/LLM のセキュリティに関する記事なら true',
  '  "summary": string,     // 日本語の短い要約（2〜3文）',
  '  "detail": string,      // 日本語の要点（箇条書き、各行を「- 」で開始）',
  '  "labels": string[],    // 付与するラベル（既存ラベルがあれば優先して再利用）',
  '  "originalLang": string // 原文の言語コード（例: en, ja）',
  "}",
  "要約・詳細は必ず日本語で書くこと。記事本文を逐語的に転載しないこと。",
].join("\n");

/** 記事と既存ラベルから AI への入力（system / user）を組み立てる。 */
export function buildAnalysisPrompt(input: AnalysisPromptInput): AnalysisPrompt {
  const labelList =
    input.existingLabels.length > 0
      ? input.existingLabels.join(", ")
      : "(まだ無し)";
  const user = [
    `ソース: ${input.source}`,
    `タイトル: ${input.title}`,
    `既存ラベル: ${labelList}`,
    "本文:",
    input.body,
  ].join("\n");
  return { system: SYSTEM_PROMPT, user };
}
