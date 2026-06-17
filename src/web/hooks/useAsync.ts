import { useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: T };

/** 非同期取得の loading/error/ready を扱う最小フック。deps 変化で再取得する。 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    load().then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (active) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      active = false;
    };
    // load は deps から再生成される前提で、deps のみを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
