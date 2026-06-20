// AI 解析プロンプトの組立（I/O 非依存）。
// 1 回の呼び出しで「AI セキュリティ関連性の二次判定・日本語要約/詳細・ラベル分類」を行わせる。

export interface AnalysisPromptInput {
  title: string;
  /** 本文（取得成功時）または RSS 抜粋（フォールバック時） */
  body: string;
  source: string;
  /** 既存ラベル一覧（表記揺れ防止のため候補として提示） */
  existingLabels: string[];
  /** 本文取得に失敗し RSS 抜粋を body に渡しているか。true なら判定指示を緩める */
  fetchFailed?: boolean;
}

export interface AnalysisPrompt {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = [
  "あなたは AI セキュリティ分野の専門エディターです。与えられた記事を分析し、次の各フィールドを返してください。",
  "- relevant: AI/LLM のセキュリティ（プロンプトインジェクション、ジェイルブレイク、敵対的攻撃、モデルの脆弱性など）に直接関係する記事なら true。単なる AI 一般の話題やセキュリティ一般の話題は false。",
  "- summary: 日本語の短い要約（2〜3文）。記事一覧カードでの概要表示に使う。",
  "- detail: 日本語の Markdown 形式による詳細要約。読者がそのトピックを単体で理解できる密度で書く。GitHub Flavored Markdown を使ってよい（見出し『##』、箇条書き、表、コードブロック、強調等）。",
  "  推奨セクション構成（記事の内容に応じて選び、該当しないものは省略する）:",
  "    ## 概要 — 記事のトピックの全体像（命名された攻撃や用語があればその説明も含める）",
  "    ## 要点 — 攻撃チェーンや主要な事実の要点",
  "    ## 影響範囲 — 対象と影響度。表形式が適する場合は表で示す",
  "    ## 対策 — 推奨される修正・緩和策",
  "    ## 具体例 — 攻撃シナリオ/コード断片/PoC の概要",
  "    ## 結論 — 全体の含意・教訓",
  "- labels: 記事のサブトピックを表すラベルの配列。既存ラベルがあれば優先して再利用する。『セキュリティ』のようなカテゴリ名そのものはラベルに含めない。",
  "- originalLang: 原文の言語コード（例: en, ja）。",
  "要約・詳細は必ず日本語で書くこと。記事本文を逐語的に転載しないこと。",
].join("\n");

// プロンプトに含めるラベル候補の上限。多すぎると AI が表記揺れ抑制に集中できず
// プロンプトコストも増えるため、頻出順ではなく辞書順で先頭 N 件のみ提示する。
const MAX_LABELS_IN_PROMPT = 50;

/** 記事と既存ラベルから AI への入力（system / user）を組み立てる。 */
export function buildAnalysisPrompt(input: AnalysisPromptInput): AnalysisPrompt {
  const limitedLabels = [...input.existingLabels]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_LABELS_IN_PROMPT);
  const labelList =
    limitedLabels.length > 0 ? limitedLabels.join(", ") : "(まだ無し)";
  const lines = [
    `ソース: ${input.source}`,
    `タイトル: ${input.title}`,
    `既存ラベル: ${labelList}`,
  ];
  if (input.fetchFailed) {
    lines.push(
      "備考: 本文取得に失敗しています。RSS抜粋のみでの判定で構いません。AI セキュリティ関連性が読み取れる場合は relevant=true としてください。",
    );
  }
  lines.push("本文:", input.body);
  return { system: SYSTEM_PROMPT, user: lines.join("\n") };
}
