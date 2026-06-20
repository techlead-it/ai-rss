import { describe, it, expect } from "vite-plus/test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ApiClient, ListParams } from "../api/client";
import type { ArticleDto, ArticleListResponse } from "../../pipeline/types";
import { useInfiniteArticles } from "./useInfiniteArticles";

function article(id: number): ArticleDto {
  return {
    id,
    title: `記事${id}`,
    source: "Test",
    url: `https://example.com/${id}`,
    category: { name: "セキュリティ", slug: "security" },
    labels: [],
    summary: `要約${id}`,
    detail: "- 要点",
    publishedAt: "2026-06-17T00:00:00Z",
    fetchFailed: false,
  };
}

function paginatedApi(
  total: number,
  perPage = 2,
): {
  api: ApiClient;
  calls: ListParams[];
} {
  const calls: ListParams[] = [];
  const all = Array.from({ length: total }, (_, i) => article(i + 1));
  const api: ApiClient = {
    listArticles: async (params) => {
      calls.push(params);
      const page = params.page ?? 1;
      const size = params.perPage ?? perPage;
      const start = (page - 1) * size;
      return {
        items: all.slice(start, start + size),
        page,
        perPage: size,
        total,
      };
    },
    getArticle: async () => null,
    listLabels: async () => [],
    listCategories: async () => [],
    listSources: async () => [],
  };
  return { api, calls };
}

describe("useInfiniteArticles", () => {
  it("loads the first page on mount", async () => {
    const { api } = paginatedApi(5, 2);
    const { result } = renderHook(() => useInfiniteArticles(api, { perPage: 2 }));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("not ready");
    expect(result.current.items.map((a) => a.id)).toEqual([1, 2]);
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);
  });

  it("appends the next page when loadMore is called", async () => {
    const { api, calls } = paginatedApi(5, 2);
    const { result } = renderHook(() => useInfiniteArticles(api, { perPage: 2 }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      if (result.current.status === "ready") result.current.loadMore();
    });

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.items.map((a) => a.id)).toEqual([1, 2, 3, 4]);
    });
    expect(calls.map((c) => c.page)).toEqual([1, 2]);
  });

  it("marks hasMore as false once all items are loaded", async () => {
    const { api } = paginatedApi(3, 2);
    const { result } = renderHook(() => useInfiniteArticles(api, { perPage: 2 }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      if (result.current.status === "ready") result.current.loadMore();
    });

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.hasMore).toBe(false);
      expect(result.current.items).toHaveLength(3);
    });
  });

  it("does not fetch the next page when loadMore is called while already loading", async () => {
    const { api, calls } = paginatedApi(10, 2);
    const { result } = renderHook(() => useInfiniteArticles(api, { perPage: 2 }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      if (result.current.status === "ready") {
        result.current.loadMore();
        result.current.loadMore();
        result.current.loadMore();
      }
    });

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.items).toHaveLength(4);
    });
    expect(calls.map((c) => c.page)).toEqual([1, 2]);
  });

  it("resets to page 1 and clears items when params change", async () => {
    const { api, calls } = paginatedApi(5, 2);
    const { result, rerender } = renderHook(
      ({ label }: { label?: string }) => useInfiniteArticles(api, { label, perPage: 2 }),
      { initialProps: { label: undefined as string | undefined } },
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => {
      if (result.current.status === "ready") result.current.loadMore();
    });
    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.items).toHaveLength(4);
    });

    rerender({ label: "prompt-injection" });

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.items.map((a) => a.id)).toEqual([1, 2]);
    });
    const labelCalls = calls.filter((c) => c.label === "prompt-injection");
    expect(labelCalls).toHaveLength(1);
    expect(labelCalls[0].page).toBe(1);
  });

  it("exposes an error state when the initial fetch fails", async () => {
    const api: ApiClient = {
      listArticles: async () => {
        throw new Error("boom");
      },
      getArticle: async () => null,
      listLabels: async () => [],
      listCategories: async () => [],
      listSources: async () => [],
    };
    const { result } = renderHook(() => useInfiniteArticles(api, {}));
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("not error");
    expect(result.current.error.message).toBe("boom");
  });

  it("aborts the in-flight request when params change", async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst: (res: ArticleListResponse) => void = () => {};
    const api: ApiClient = {
      listArticles: (params, signal) => {
        if (signal) signals.push(signal);
        if (signals.length === 1) {
          return new Promise<ArticleListResponse>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve({
          items: [article(99)],
          page: params.page ?? 1,
          perPage: params.perPage ?? 2,
          total: 1,
        });
      },
      getArticle: async () => null,
      listLabels: async () => [],
      listCategories: async () => [],
      listSources: async () => [],
    };

    const { rerender, result } = renderHook(
      ({ label }: { label?: string }) =>
        useInfiniteArticles(api, { label, perPage: 2 }),
      { initialProps: { label: "a" as string | undefined } },
    );

    await waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0].aborted).toBe(false);

    rerender({ label: "b" });

    await waitFor(() => expect(signals[0].aborted).toBe(true));

    // 古い (中断後の) レスポンスが届いても無視される。
    resolveFirst({
      items: [article(1)],
      page: 1,
      perPage: 2,
      total: 1,
    });

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.items.map((a) => a.id)).toEqual([99]);
    });
    if (result.current.status !== "ready") throw new Error("not ready");
    expect(result.current.loadMoreError).toBeUndefined();
  });

  it("keeps items and surfaces loadMoreError when a subsequent page fails", async () => {
    let callCount = 0;
    const all = [article(1), article(2), article(3), article(4)];
    const api: ApiClient = {
      listArticles: async (): Promise<ArticleListResponse> => {
        callCount++;
        if (callCount === 1) {
          return { items: all.slice(0, 2), page: 1, perPage: 2, total: 4 };
        }
        throw new Error("page-2-failed");
      },
      getArticle: async () => null,
      listLabels: async () => [],
      listCategories: async () => [],
      listSources: async () => [],
    };

    const { result } = renderHook(() => useInfiniteArticles(api, { perPage: 2 }));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      if (result.current.status === "ready") result.current.loadMore();
    });

    await waitFor(() => {
      if (result.current.status !== "ready") throw new Error("not ready");
      expect(result.current.loadMoreError?.message).toBe("page-2-failed");
    });
    if (result.current.status !== "ready") throw new Error("not ready");
    expect(result.current.items.map((a) => a.id)).toEqual([1, 2]);
  });
});
