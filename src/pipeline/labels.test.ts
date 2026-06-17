import { describe, it, expect } from "vite-plus/test";
import { normalizeLabel } from "./labels";

describe("normalizeLabel (既存ラベルへの表記揺れ吸収)", () => {
  const existing = ["プロンプトインジェクション", "ジェイルブレイク", "敵対的攻撃"];

  it("returns the existing label unchanged when it already matches", () => {
    expect(normalizeLabel("プロンプトインジェクション", existing)).toBe(
      "プロンプトインジェクション",
    );
  });

  it("snaps spacing/case variants to the existing label", () => {
    expect(normalizeLabel("prompt injection", ["Prompt Injection"])).toBe(
      "Prompt Injection",
    );
    expect(normalizeLabel("  ジェイルブレイク ", existing)).toBe("ジェイルブレイク");
  });

  it("keeps a genuinely new label (trimmed) as-is", () => {
    expect(normalizeLabel("  データポイズニング ", existing)).toBe(
      "データポイズニング",
    );
  });
});
