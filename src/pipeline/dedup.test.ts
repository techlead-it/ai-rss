import { describe, it, expect } from "vite-plus/test";
import { dedupKey } from "./dedup";

describe("dedupKey", () => {
  it("returns the guid when present, ignoring the url", () => {
    expect(dedupKey({ url: "https://e.com/a", guid: "guid-1" })).toBe("guid-1");
  });

  it("falls back to the url when the guid is empty or missing", () => {
    expect(dedupKey({ url: "https://e.com/a", guid: null })).toBe(
      "https://e.com/a",
    );
    expect(dedupKey({ url: "https://e.com/a", guid: "   " })).toBe(
      "https://e.com/a",
    );
  });

  it("trims surrounding whitespace from the chosen key", () => {
    expect(dedupKey({ url: null, guid: "  guid-1  " })).toBe("guid-1");
    expect(dedupKey({ url: "  https://e.com/a  ", guid: null })).toBe(
      "https://e.com/a",
    );
  });

  it("returns null when neither guid nor url is usable", () => {
    expect(dedupKey({ url: "   ", guid: null })).toBeNull();
    expect(dedupKey({ url: null, guid: null })).toBeNull();
  });
});
