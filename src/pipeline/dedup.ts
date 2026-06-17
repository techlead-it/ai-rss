/**
 * 記事の dedup キーを返す。url を第一キーとし、無ければ guid を使う。
 * どちらも使えなければ null（呼び出し側で当該記事をスキップする）。
 */
export function dedupKey(item: {
  url: string | null;
  guid: string | null;
}): string | null {
  const url = item.url?.trim();
  if (url) return url;
  const guid = item.guid?.trim();
  if (guid) return guid;
  return null;
}
