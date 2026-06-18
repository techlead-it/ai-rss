// 検証用の手動トリガーハンドラ。`POST /__run-collection?token=...` の認可ロジックを
// I/O から分離してテスト可能にする。実体の収集は呼び出し側が `trigger` 引数で渡す。

export interface TriggerDeps {
  /** Worker 環境変数 RUN_TOKEN の値 */
  expectedToken: string | undefined;
  /** クエリ ?token=... の値 */
  providedToken: string | null;
  /** 認可成功時に呼ばれる。呼び出し側で `ctx.waitUntil(runCollection(...))` をラップする */
  trigger: () => void;
}

export interface TriggerResponse {
  status: number;
  body: string;
}

export function handleTrigger(deps: TriggerDeps): TriggerResponse {
  if (!deps.expectedToken) {
    return { status: 503, body: "trigger disabled (RUN_TOKEN not set)" };
  }
  if (deps.providedToken !== deps.expectedToken) {
    return { status: 401, body: "unauthorized" };
  }
  deps.trigger();
  return { status: 202, body: "collection accepted" };
}
