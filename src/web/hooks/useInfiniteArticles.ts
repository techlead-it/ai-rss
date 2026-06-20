import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient, ListParams } from "../api/client";
import type { ArticleDto } from "../../pipeline/types";

export type InfiniteArticlesState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | {
      status: "ready";
      items: ArticleDto[];
      total: number;
      hasMore: boolean;
      isLoadingMore: boolean;
      loadMore: () => void;
      loadMoreError?: Error;
    };

type FetchParams = Pick<ListParams, "label" | "q" | "perPage">;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/**
 * 無限スクロール用の記事ページング状態を扱うフック。
 * params (label/q) 変更時はページ1からやり直し、loadMore() で次ページを末尾に追記する。
 */
export function useInfiniteArticles(api: ApiClient, params: FetchParams): InfiniteArticlesState {
  const { label, q, perPage } = params;
  const [items, setItems] = useState<ArticleDto[]>([]);
  const [total, setTotal] = useState(0);
  const [initialStatus, setInitialStatus] = useState<"loading" | "ready" | "error">("loading");
  const [initialError, setInitialError] = useState<Error | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<Error | undefined>(undefined);

  // params 変更で増える世代カウンタ。古い世代のレスポンスは破棄する。
  const generationRef = useRef(0);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  // 現世代の AbortController。世代切り替え時に古い fetch を中断する。
  const abortRef = useRef<AbortController | null>(null);
  // loadMore の参照を安定させるため、長さ判定用の最新値を ref に映す。
  const itemsLenRef = useRef(0);
  const totalRef = useRef(0);
  useEffect(() => {
    itemsLenRef.current = items.length;
    totalRef.current = total;
  }, [items.length, total]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const gen = ++generationRef.current;
    pageRef.current = 1;
    loadingRef.current = true;
    setInitialStatus("loading");
    setInitialError(null);
    setLoadMoreError(undefined);
    setIsLoadingMore(false);
    setItems([]);
    setTotal(0);

    api
      .listArticles({ label, q, page: 1, perPage }, controller.signal)
      .then(
        (res) => {
          if (gen !== generationRef.current) return;
          setItems(res.items);
          setTotal(res.total);
          setInitialStatus("ready");
        },
        (err: unknown) => {
          if (gen !== generationRef.current) return;
          if (controller.signal.aborted || isAbortError(err)) return;
          setInitialError(err instanceof Error ? err : new Error(String(err)));
          setInitialStatus("error");
        },
      )
      .finally(() => {
        if (gen === generationRef.current) loadingRef.current = false;
      });

    return () => controller.abort();
  }, [api, label, q, perPage]);

  const hasMore = items.length < total;

  // params が変わらない限り参照を安定させる。長さ判定は ref 経由で最新値を見る。
  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    if (itemsLenRef.current >= totalRef.current) return;

    const gen = generationRef.current;
    const controller = abortRef.current;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    loadingRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(undefined);

    api
      .listArticles({ label, q, page: nextPage, perPage }, controller?.signal)
      .then(
        (res) => {
          if (gen !== generationRef.current) return;
          setItems((prev) => [...prev, ...res.items]);
          setTotal(res.total);
        },
        (err: unknown) => {
          if (gen !== generationRef.current) return;
          if (controller?.signal.aborted || isAbortError(err)) {
            // abort された分は静かに巻き戻して再試行可能にする
            pageRef.current = nextPage - 1;
            return;
          }
          // 失敗したページは次回再試行できるよう pageRef を巻き戻す
          pageRef.current = nextPage - 1;
          setLoadMoreError(err instanceof Error ? err : new Error(String(err)));
        },
      )
      .finally(() => {
        if (gen === generationRef.current) {
          loadingRef.current = false;
          setIsLoadingMore(false);
        }
      });
  }, [api, label, q, perPage]);

  if (initialStatus === "loading") return { status: "loading" };
  if (initialStatus === "error") {
    return {
      status: "error",
      error: initialError ?? new Error("unknown error"),
    };
  }
  return {
    status: "ready",
    items,
    total,
    hasMore,
    isLoadingMore,
    loadMore,
    loadMoreError,
  };
}
