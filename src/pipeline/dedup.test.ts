import { describe, it, expect } from "vite-plus/test";
import { dedupKey } from "./dedup";

describe("dedupKey", () => {
  it("returns the url when present", () => {
    expect(dedupKey({ url: "https://example.com/a", guid: "g-1" })).toBe(
      "https://example.com/a",
    );
  });

  it("trims surrounding whitespace from the url", () => {
    expect(dedupKey({ url: "  https://example.com/a  ", guid: null })).toBe(
      "https://example.com/a",
    );
  });

  it("falls back to the guid when the url is empty", () => {
    expect(dedupKey({ url: "", guid: "guid-123" })).toBe("guid-123");
  });

  it("returns null when neither url nor guid is usable", () => {
    expect(dedupKey({ url: "   ", guid: null })).toBeNull();
  });
});
