import { describe, it, expect } from "vite-plus/test";
import { htmlToText } from "./text";

describe("htmlToText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(htmlToText("<p>Hello   <b>world</b></p>\n<p>!</p>")).toBe(
      "Hello world !",
    );
  });

  it("removes script and style blocks entirely", () => {
    expect(htmlToText("<style>.a{}</style><script>x()</script>本文だけ")).toBe(
      "本文だけ",
    );
  });

  it("decodes common HTML entities", () => {
    expect(htmlToText("a &amp; b &lt;tag&gt; &#39;q&#39;")).toBe("a & b <tag> 'q'");
  });
});
