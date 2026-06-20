import { Outlet, ScrollRestoration } from "react-router";

/**
 * 全ルート共通レイアウト。
 * ScrollRestoration により push 遷移ではトップへ、pop（戻る/進む）では
 * 前回のスクロール位置を復元する。SWR のキャッシュで戻り先の DOM 高さが
 * 即座に揃うため、復元位置が再現できる。
 */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
