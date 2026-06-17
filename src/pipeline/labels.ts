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
