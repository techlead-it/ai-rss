import { describe, it, expect } from "vite-plus/test";
import { FEEDS } from "./definitions";

describe("FEEDS", () => {
  it("defines multiple reachable feed sources", () => {
    expect(FEEDS.length).toBeGreaterThanOrEqual(5);
    for (const feed of FEEDS) {
      expect(feed.url).toMatch(/^https:\/\//);
      expect(feed.source.length).toBeGreaterThan(0);
    }
  });

  it("includes the AI-security specialist sources", () => {
    const sources = FEEDS.map((f) => f.source);
    expect(sources).toContain("Simon Willison's Weblog");
    expect(sources).toContain("Embrace The Red");
  });

  it("classifies every feed with a kind for the sources screen", () => {
    for (const feed of FEEDS) {
      expect(feed.kind?.length).toBeGreaterThan(0);
    }
  });

  it("narrows the high-volume arXiv feed with keywords", () => {
    const arxiv = FEEDS.find((f) => f.source === "arXiv cs.CR");
    expect(arxiv?.keywords?.length).toBeGreaterThan(0);
  });
});
