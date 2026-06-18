import { describe, it, expect } from "vite-plus/test";
import { matchesAnyKeyword } from "./keywords";

describe("matchesAnyKeyword", () => {
  it("matches an ASCII keyword as a whole word", () => {
    expect(matchesAnyKeyword("LLM security overview", ["llm"])).toBe(true);
    expect(matchesAnyKeyword("(AI) overview", ["ai"])).toBe(true);
    expect(matchesAnyKeyword("AI-powered phishing", ["ai"])).toBe(true);
  });

  it("does not match an ASCII keyword inside an unrelated word", () => {
    expect(
      matchesAnyKeyword(
        "Junior Hacker Used Tailscale and OpenSSH",
        ["ai", "llm"],
      ),
    ).toBe(false);
    expect(matchesAnyKeyword("mainframe vulnerability", ["ai"])).toBe(false);
    expect(matchesAnyKeyword("rainfall sensor attack", ["ai"])).toBe(false);
  });

  it("matches a Japanese (non-ASCII) keyword as a substring", () => {
    // 日本語は単語境界が無いので部分一致のままにする。
    expect(matchesAnyKeyword("人工知能の安全性", ["人工知能"])).toBe(true);
    expect(matchesAnyKeyword("生成aiの活用事例", ["生成ai"])).toBe(true);
  });

  it("matches an ASCII compound term (with whitespace) as a substring", () => {
    // "prompt injection" のような複合キーワードは substring 一致のまま。
    expect(
      matchesAnyKeyword("A new prompt injection technique", ["prompt injection"]),
    ).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesAnyKeyword("New LLM Issue", ["llm"])).toBe(true);
    expect(matchesAnyKeyword("OPENAI announcement", ["openai"])).toBe(true);
  });
});
