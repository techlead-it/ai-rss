/**
 * 記事の dedup キーを返す。guid を第一キーとし、無ければ url をフォールバックに使う。
 * どちらも使えなければ null（呼び出し側で当該記事をスキップする）。
 *
 * guid 優先の理由:
 * - 8 フィード源すべてが guid を返している（Atom の <id> は必須、RSS でもまともなフィードは付与する）
 * - フィードが後から URL のクエリやパスを変えるケースは現実的にほぼ無いが、guid なら絶対安定
 * - URL 正規化（トラッキングパラメータ除去・末尾スラッシュ統一）と D1 保存値の不一致による
 *   「過去記事が毎 tick で新規扱いされる」事故を構造的に避ける
 */
export function dedupKey(item: {
  url: string | null;
  guid: string | null;
}): string | null {
  const guid = item.guid?.trim();
  if (guid) return guid;
  const url = item.url?.trim();
  if (url) return url;
  return null;
}
