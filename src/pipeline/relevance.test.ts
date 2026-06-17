import { describe, it, expect } from "vite-plus/test";
import { isLikelyAiSecurity } from "./relevance";

describe("isLikelyAiSecurity (一次キーワードフィルタ)", () => {
  it("accepts text containing a strong compound term", () => {
    expect(isLikelyAiSecurity("新手のプロンプトインジェクション手法")).toBe(true);
    expect(isLikelyAiSecurity("A new prompt injection technique")).toBe(true);
    expect(isLikelyAiSecurity("LLM jailbreak roundup")).toBe(true);
  });

  it("accepts text combining an AI term and a security term", () => {
    expect(isLikelyAiSecurity("Security best practices for LLM applications")).toBe(
      true,
    );
    expect(isLikelyAiSecurity("AIモデルの脆弱性に関する調査")).toBe(true);
  });

  it("rejects security text with no AI relation", () => {
    expect(isLikelyAiSecurity("新しいCPUの脆弱性が見つかった")).toBe(false);
  });

  it("rejects AI text with no security relation", () => {
    expect(isLikelyAiSecurity("新しいLLMの性能ベンチマーク")).toBe(false);
  });

  it("rejects unrelated text", () => {
    expect(isLikelyAiSecurity("週末のおすすめレシピ集")).toBe(false);
  });
});
