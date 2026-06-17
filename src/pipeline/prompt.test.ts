import { describe, it, expect } from "vite-plus/test";
import { buildAnalysisPrompt } from "./prompt";

describe("buildAnalysisPrompt", () => {
  const input = {
    title: "New prompt injection technique",
    body: "Researchers found a way to bypass guardrails...",
    source: "Embrace The Red",
    existingLabels: ["プロンプトインジェクション", "ジェイルブレイク"],
  };

  it("includes the article title, body and source in the user prompt", () => {
    const { user } = buildAnalysisPrompt(input);
    expect(user).toContain("New prompt injection technique");
    expect(user).toContain("Researchers found a way to bypass guardrails");
    expect(user).toContain("Embrace The Red");
  });

  it("lists existing labels so the model reuses them", () => {
    const { user } = buildAnalysisPrompt(input);
    expect(user).toContain("プロンプトインジェクション");
    expect(user).toContain("ジェイルブレイク");
  });

  it("instructs Japanese JSON output with the expected fields", () => {
    const { system } = buildAnalysisPrompt(input);
    expect(system).toContain("日本語");
    expect(system).toContain("relevant");
    expect(system).toContain("summary");
    expect(system).toContain("detail");
    expect(system).toContain("labels");
  });

  it("adds a notice for fetchFailed=true to soften relevance judgement", () => {
    const { user } = buildAnalysisPrompt({ ...input, fetchFailed: true });
    expect(user).toContain("本文取得に失敗");
  });

  it("omits the fetch-failed notice when fetchFailed is false or unset", () => {
    const { user: a } = buildAnalysisPrompt(input);
    const { user: b } = buildAnalysisPrompt({ ...input, fetchFailed: false });
    expect(a).not.toContain("本文取得に失敗");
    expect(b).not.toContain("本文取得に失敗");
  });

  it("caps the existing-label list at 50 items so the prompt stays bounded", () => {
    const existingLabels = Array.from(
      { length: 60 },
      (_, i) => `ラベル${String(i).padStart(2, "0")}`,
    );
    const { user } = buildAnalysisPrompt({ ...input, existingLabels });
    const labelLine = user
      .split("\n")
      .find((line) => line.startsWith("既存ラベル:"));
    if (!labelLine) throw new Error("既存ラベル行が見つからない");
    const labels = labelLine
      .replace("既存ラベル: ", "")
      .split(", ")
      .filter((s) => s.length > 0);
    expect(labels.length).toBe(50);
  });
});
