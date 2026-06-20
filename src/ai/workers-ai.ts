import type { Ai } from "@cloudflare/workers-types";
import type { AiEngine } from "./engine";
import type { ArticleAnalysis } from "../pipeline/types";
import { buildAnalysisPrompt } from "../pipeline/prompt";
import { NeuronLimitError, isNeuronLimitError } from "./errors";

// 採用モデル（docs/MODELS.md 参照）。要約・分類とも単一モデルで実行する。
export const SUMMARY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// guided JSON。これで valid JSON 出力を強制し、detail を Markdown 文字列として受け取る。
const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    relevant: { type: "boolean" },
    summary: { type: "string" },
    detail: { type: "string" },
    labels: { type: "array", items: { type: "string" } },
    originalLang: { type: "string" },
  },
  required: ["relevant", "summary", "detail", "labels", "originalLang"],
} as const;

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI response did not contain a JSON object");
  }
  return candidate.slice(start, end + 1);
}

function parseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(extractJsonObject(text)) as Record<string, unknown>;
  } catch {
    throw new Error("AI response is not valid JSON");
  }
}

/** Workers AI の応答（guided JSON のオブジェクト / 文字列 / choices 形式）から解析オブジェクトを取り出す。 */
function toResultObject(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") return parseJson(raw);
  if (raw && typeof raw === "object") {
    const obj = raw as {
      response?: unknown;
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    if (obj.response && typeof obj.response === "object") {
      return obj.response as Record<string, unknown>;
    }
    if (typeof obj.response === "string") return parseJson(obj.response);
    const content = obj.choices?.[0]?.message?.content;
    if (typeof content === "string") return parseJson(content);
  }
  throw new Error("AI response had no parseable content");
}

/** Workers AI の応答から ArticleAnalysis を取り出す。 */
export function parseAnalysis(raw: unknown): ArticleAnalysis {
  const obj = toResultObject(raw);
  return {
    relevant: obj.relevant === true,
    summary: typeof obj.summary === "string" ? obj.summary : "",
    detail: typeof obj.detail === "string" ? obj.detail : "",
    labels: Array.isArray(obj.labels)
      ? obj.labels.filter((l): l is string => typeof l === "string")
      : [],
    originalLang: typeof obj.originalLang === "string" ? obj.originalLang : null,
  };
}

/** Workers AI バインディングを使う AI エンジン実装。 */
export function createWorkersAiEngine(ai: Ai, model = SUMMARY_MODEL): AiEngine {
  return {
    async analyze(input) {
      const { system, user } = buildAnalysisPrompt(input);
      let raw: unknown;
      try {
        raw = await ai.run(model, {
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_schema", json_schema: ANALYSIS_SCHEMA },
        });
      } catch (err) {
        if (isNeuronLimitError(err)) throw new NeuronLimitError();
        throw err;
      }
      return parseAnalysis(raw);
    },
  };
}
