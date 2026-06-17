const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** HTML 断片からプレーンテキストを取り出す（script/style 除去・タグ除去・実体参照デコード・空白正規化）。 */
export function htmlToText(html: string): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, " ");
  const decoded = withoutTags.replace(
    /&[a-zA-Z]+;|&#\d+;/g,
    (m) => NAMED_ENTITIES[m] ?? m,
  );
  return decoded.replace(/\s+/g, " ").trim();
}
