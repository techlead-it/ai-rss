import { describe, it, expect } from "vite-plus/test";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import type { ApiClient, ListParams } from "../api/client";
import { createFakeApiClient } from "../api/test-fakes";
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
  const api = createFakeApiClient({
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
  });
  return { api, calls };
}

// テスト間でキャッシュを完全に分離する。
function freshCacheWrapper() {
  const cache = new Map();
  return function CacheWrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );
  };
}

describe("useInfiniteArticles", () => {
  it("loads the first page on mount", async () => {
    const { api } = paginatedApi(5, 2);
    const { result } = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: freshCacheWrapper() },
    );

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("not ready");
    expect(result.current.items.map((a) => a.id)).toEqual([1, 2]);
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);
  });

  it("appends the next page when loadMore is called", async () => {
    const { api, calls } = paginatedApi(5, 2);
    const { result } = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: freshCacheWrapper() },
    );
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
    const { result } = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: freshCacheWrapper() },
    );
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
    const { result } = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: freshCacheWrapper() },
    );
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
      ({ label }: { label?: string }) =>
        useInfiniteArticles(api, { label, perPage: 2 }),
      {
        wrapper: freshCacheWrapper(),
        initialProps: { label: undefined as string | undefined },
      },
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
    const api = createFakeApiClient({
      listArticles: async () => {
        throw new Error("boom");
      },
    });
    const { result } = renderHook(() => useInfiniteArticles(api, {}), {
      wrapper: freshCacheWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("not error");
    expect(result.current.error.message).toBe("boom");
  });

  it("keeps items and surfaces loadMoreError when a subsequent page fails", async () => {
    let callCount = 0;
    const all = [article(1), article(2), article(3), article(4)];
    const api = createFakeApiClient({
      listArticles: async (): Promise<ArticleListResponse> => {
        callCount++;
        if (callCount === 1) {
          return { items: all.slice(0, 2), page: 1, perPage: 2, total: 4 };
        }
        throw new Error("page-2-failed");
      },
    });

    const { result } = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: freshCacheWrapper() },
    );
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

  it("restores cached items instantly on remount within the same SWR cache", async () => {
    const { api, calls } = paginatedApi(10, 2);
    const Wrapper = freshCacheWrapper();
    const first = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    await act(async () => {
      if (first.result.current.status === "ready")
        first.result.current.loadMore();
    });
    await waitFor(() => {
      if (first.result.current.status !== "ready")
        throw new Error("not ready");
      expect(first.result.current.items).toHaveLength(4);
    });
    const callsBeforeRemount = calls.length;

    first.unmount();

    // 同じ SWR cache 配下で再マウントすると、loading を経由せず即時 ready で
    // 取得済みの 4 件が復元される。再 fetch も発生しない。
    const second = renderHook(
      () => useInfiniteArticles(api, { perPage: 2 }),
      { wrapper: Wrapper },
    );

    expect(second.result.current.status).toBe("ready");
    if (second.result.current.status !== "ready") throw new Error("not ready");
    expect(second.result.current.items.map((a) => a.id)).toEqual([1, 2, 3, 4]);
    expect(calls.length).toBe(callsBeforeRemount);
  });
});
