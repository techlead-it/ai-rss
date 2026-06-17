// 同一記事を別 URL として保存しないよう剥がすトラッキングクエリ
const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAM_NAMES = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

function isTrackingParam(name: string): boolean {
  if (TRACKING_PARAM_NAMES.has(name)) return true;
  return TRACKING_PARAM_PREFIXES.some((p) => name.startsWith(p));
}

/**
 * URL を dedup 用に正規化する。スキーム/ホストの小文字化、末尾スラッシュ統一
 * （ルート除く）、トラッキングクエリ（utm_*, fbclid, gclid, mc_*）の除去を行う。
 * `URL` API でパース不能な入力は trim のみ返す。
 */
export function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) url.searchParams.delete(name);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  // URL.toString() は scheme/host を既に lowercase 化する
  return url.toString();
}

/**
 * 記事の dedup キーを返す。url を第一キーとし（正規化して返す）、無ければ guid を使う。
 * どちらも使えなければ null（呼び出し側で当該記事をスキップする）。
 */
export function dedupKey(item: {
  url: string | null;
  guid: string | null;
}): string | null {
  const url = item.url?.trim();
  if (url) return normalizeUrl(url);
  const guid = item.guid?.trim();
  if (guid) return guid;
  return null;
}
