import { describe, it, expect } from "vite-plus/test";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats an ISO date as YYYY/MM/DD", () => {
    expect(formatDate("2026-06-17T09:00:00Z")).toBe("2026/06/17");
  });

  it("returns empty string for null or invalid input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});
