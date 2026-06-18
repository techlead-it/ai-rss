// キーワードマッチング共通ロジック。ASCII のみの英単語キーワードは単語境界で判定し、
// 'ai' が 'tailscale' / 'mainframe' のような無関係な単語に部分一致する事故を防ぐ。
// 日本語キーワードは単語境界の概念が無いので部分一致のままにする。

function isAsciiWordKeyword(s: string): boolean {
  // ASCII 英数字のみで構成される単一トークン。複合語（空白入り）は除外。
  return /^[a-z0-9]+$/i.test(s);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(keyword: string): (haystack: string) => boolean {
  const k = keyword.toLowerCase();
  if (isAsciiWordKeyword(k)) {
    const re = new RegExp(`\\b${escapeRegex(k)}\\b`);
    return (haystack) => re.test(haystack);
  }
  return (haystack) => haystack.includes(k);
}

/**
 * テキストに少なくとも 1 つのキーワードが含まれるかを判定する。
 * ASCII 英数字キーワードは単語境界で囲んでマッチ。それ以外は部分一致。
 * 呼び出し側は事前に text/keywords を小文字化する必要はない（内部で揃える）。
 */
export function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => buildMatcher(k)(lower));
}
