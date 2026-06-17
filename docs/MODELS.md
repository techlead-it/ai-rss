# Workers AI モデル選定メモ（AIセキュリティ記事の日本語要約・分類）

調査日: 2026-06-18 / 調査方法: サブエージェント2体による並行調査＋相互検証（Cloudflare公式ドキュメント・日本語ベンチを Web 参照）

## 結論（先に要約）

- **Workers AI は各モデルの「日本語対応」を公式には明記していない**。ただし上流モデルの事実として **Qwen3 / Gemma 3・4 / GLM 系は日本語対応**、**Llama 3.3 の公式8言語に日本語は含まれない**（実用上は動くが非公式）。
- 日本語の**生成の自然さ・翻訳(英→日)**は **Llama 系が優位**、日本語の**理解・分類精度**は **Qwen 系が優位**（ただし出力に簡体字が混入するクセあり）。
- 最終的なモデルは**フェーズ11で実記事を使い品質を実測して確定**する。本書はその候補リスト。

## 使えるモデル候補リスト（2026-06 時点・実在確認済み）

価格は Neurons / 100万トークン（入力 / 出力）。無料枠 10,000 Neurons/日。

### Tier A: 要約・翻訳向け（ユーザに見せる日本語。自然さ・長文読解重視）

| モデルID | 規模 | context | Neurons(入/出) | 備考 |
|---|---|---|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 70B | 〜128k（公式表記24,000は要確認） | 26,668 / 204,805 | **本命**。日本語生成が自然・指示追従/長文に強い。JA非公式だが実用。出力単価高め |
| `@cf/google/gemma-4-26b-a4b-it` | 26B | 256k | 9,091 / 27,273 | 指示追従が堅くコスト中。日本語実測データは薄く**要検証** |
| `@cf/openai/gpt-oss-120b` | 120B | 128k | 31,818 / 68,182 | 大型・JSON(`response_format`)対応。JA記載なし**要検証** |

### Tier B: 分類・関連性判定向け（内部処理。コスト/構造化出力重視）

| モデルID | 規模 | context | Neurons(入/出) | 備考 |
|---|---|---|---|---|
| `@cf/qwen/qwen3-30b-a3b-fp8` | 30B(MoE,活性3B) | 32k | 4,625 / 30,475 | **最有力**。激安・日本語理解が高い・function calling。簡体字混入は対策要 |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 24B | 128k | 31,876 / 50,488 | `guided_json`＋function calling 明記。分類のJSON出力が安定しやすい |

### 採用を避ける/不可

- `@cf/google/gemma-3-12b-it` — `guided_json` 対応だが **2026/5/30 非推奨**。新規採用は避ける。
- ベンチ最強格の **Qwen2.5-72B-Instruct / Gemma 2 27B は Workers AI 未提供**（Qwenは Coder 版のみ、Gemmaは3/4に世代交代）。外部推論基盤を併用しない限り使えない。
- Llama 3.1-70B 系・旧 Llama/Mistral の多くは非推奨。

## 推奨スタート構成

1. **まず動かす（単一モデル）**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` で要約・分類とも実行（元計画どおり）。MVPの記事量なら無料枠に収まる見込み。
2. **コスト最適化したい場合（二段構成）**: 要約・翻訳=`llama-3.3-70b`、分類・関連性判定=`qwen3-30b-a3b-fp8`。分類は安価モデルで十分。
3. AIエンジンはインターフェース化済み（DESIGN.md / TODO.md フェーズ5）なので、上記候補をモデルIDの差し替えだけでA/B比較できるようにする。

## 実機検証が必要な事項（フェーズ11で確認）

- 各候補の **英→日 要約・翻訳の品質**（自然さ・正確さ）を実記事で比較
- **JSON Schema 強制 / function calling の実対応**（公式記載が薄く、モデル別に実機確認必須。`guided_json` / `response_format` / tool calling）
- Qwen 採用時は **簡体字混入**対策（低温度＋出力の文字種チェック）の要否
- `llama-3.3-70b` の context 上限（公式表記24,000と一般情報128k級の食い違い）

## 出典

- Cloudflare Workers AI Models 一覧: https://developers.cloudflare.com/workers-ai/models/
- Workers AI Pricing(Neurons): https://developers.cloudflare.com/workers-ai/platform/pricing/
- モデル選択ガイド: https://developers.cloudflare.com/workers-ai/guides/tutorials/how-to-choose-the-right-text-generation-model/
- Swallow LLM Leaderboard（日本語独立評価）: https://swallow-llm.github.io/leaderboard/about.en.html
- Llama 3.3 Swallow（英→日翻訳優位）: https://swallow-llm.github.io/llama3.3-swallow.en.html
- Shisa.ai Qwen3 日本語性能（簡体字漏れ等）: https://blog.shisa.ai/posts/qwen3-japanese-performance/index.html
- Nejumi LLM Leaderboard 4: https://nejumi.ai/
- Gemma 3 vs Qwen2.5 比較（IFEval）: https://llm-stats.com/models/compare/gemma-3-27b-it-vs-qwen-2.5-72b-instruct
