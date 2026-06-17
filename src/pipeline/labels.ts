// ラベル正規化: AI が出したラベル候補を、既存ラベルの表記に寄せる。
// 表記揺れ（大文字小文字・空白・区切り）を吸収し、重複ラベルの乱立を防ぐ。

function canonical(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s・･_/-]+/g, "");
}

/**
 * ラベル候補を既存ラベル一覧と照合する。
 * 正規化して一致する既存ラベルがあればその表記を返し、無ければ trim した候補をそのまま返す。
 */
export function normalizeLabel(candidate: string, existing: string[]): string {
  const key = canonical(candidate);
  const match = existing.find((e) => canonical(e) === key);
  return match ?? candidate.trim();
}

/**
 * ラベル名から URL 用 slug を生成する。
 * ASCII 化できればケバブケース、できない（日本語等）場合は名前から決まる短いハッシュを使う。
 */
export function slugify(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii) return ascii;
  let hash = 0;
  for (const ch of name) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  }
  return `l-${hash.toString(36)}`;
}
