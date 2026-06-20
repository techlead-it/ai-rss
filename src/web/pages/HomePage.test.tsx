import { describe, it, expect } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HomePage } from "./HomePage";
import { ApiProvider } from "../api/context";
import type { ApiClient, ListParams } from "../api/client";
import type { ArticleDto, ArticleListResponse } from "../../pipeline/types";
import { triggerIntersect } from "../../test/setup";

function article(id: number, title: string, labelSlug?: string): ArticleDto {
  return {
    id,
    title,
    source: "Test",
    url: `https://example.com/${id}`,
    category: { name: "セキュリティ", slug: "security" },
    labels: labelSlug ? [{ name: labelSlug, slug: labelSlug }] : [],
    summary: `${title} の要約`,
    detail: "- 要点",
    publishedAt: "2026-06-17T00:00:00Z",
    fetchFailed: false,
  };
}

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    listArticles: async () => ({ items: [], page: 1, perPage: 10, total: 0 }),
    getArticle: async () => null,
    listLabels: async () => [
      { name: "プロンプトインジェクション", slug: "prompt-injection", count: 1 },
    ],
    listCategories: async () => [{ name: "セキュリティ", slug: "security" }],
    listSources: async () => [],
    ...overrides,
  };
}

function renderHome(api: ApiClient) {
  return render(
    <ApiProvider client={api}>
      <MemoryRouter initialEntries={["/home"]}>
        <HomePage />
      </MemoryRouter>
    </ApiProvider>,
  );
}

describe("HomePage", () => {
  it("renders the article list", async () => {
    const api = fakeApi({
      listArticles: async () => ({
        items: [article(1, "記事A"), article(2, "記事B")],
        page: 1,
        perPage: 10,
        total: 2,
      }),
    });
    renderHome(api);
    expect(await screen.findByText("記事A")).toBeInTheDocument();
    expect(screen.getByText("記事B")).toBeInTheDocument();
  });

  it("shows the total article count", async () => {
    const api = fakeApi({
      listArticles: async () => ({
        items: [article(1, "記事A"), article(2, "記事B")],
        page: 1,
        perPage: 10,
        total: 2,
      }),
    });
    renderHome(api);
    expect(await screen.findByText("2 件の記事")).toBeInTheDocument();
  });

  it("shows a loading state initially", () => {
    const api = fakeApi({
      listArticles: () => new Promise<ArticleListResponse>(() => {}),
    });
    renderHome(api);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });

  it("shows an empty state when there are no articles", async () => {
    renderHome(fakeApi());
    expect(
      await screen.findByText("該当する記事がありません。"),
    ).toBeInTheDocument();
  });

  it("shows an error state when loading fails", async () => {
    const api = fakeApi({
      listArticles: async () => {
        throw new Error("boom");
      },
    });
    renderHome(api);
    expect(
      await screen.findByText(/記事の読み込みに失敗しました/),
    ).toBeInTheDocument();
  });

  it("filters by label when a card label chip is clicked", async () => {
    const calls: ListParams[] = [];
    const api = fakeApi({
      listArticles: async (params) => {
        calls.push(params);
        const all = [
          article(1, "インジェクション記事", "prompt-injection"),
          article(2, "無関係ラベル記事", "jailbreak"),
        ];
        const items = params.label
          ? all.filter((a) => a.labels.some((l) => l.slug === params.label))
          : all;
        return { items, page: 1, perPage: 10, total: items.length };
      },
    });
    renderHome(api);
    await screen.findByText("無関係ラベル記事");

    await userEvent.click(
      screen.getAllByRole("button", { name: "prompt-injection" })[0],
    );

    await waitFor(() =>
      expect(screen.queryByText("無関係ラベル記事")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("インジェクション記事")).toBeInTheDocument();
    expect(calls.some((c) => c.label === "prompt-injection")).toBe(true);
  });

  it("searches when the search box is submitted", async () => {
    const calls: ListParams[] = [];
    const api = fakeApi({
      listArticles: async (params) => {
        calls.push(params);
        return { items: [], page: 1, perPage: 10, total: 0 };
      },
    });
    renderHome(api);
    await userEvent.type(screen.getByLabelText("記事を検索"), "ポイズニング");
    await userEvent.click(screen.getByRole("button", { name: "検索" }));
    await waitFor(() =>
      expect(calls.some((c) => c.q === "ポイズニング")).toBe(true),
    );
  });

  it("loads the next page when the bottom sentinel intersects", async () => {
    const calls: ListParams[] = [];
    const all = Array.from({ length: 25 }, (_, i) =>
      article(i + 1, `記事${i + 1}`),
    );
    const api = fakeApi({
      listArticles: async (params) => {
        calls.push(params);
        const page = params.page ?? 1;
        const perPage = params.perPage ?? 10;
        const start = (page - 1) * perPage;
        return {
          items: all.slice(start, start + perPage),
          page,
          perPage,
          total: all.length,
        };
      },
    });
    renderHome(api);

    await screen.findByText("記事10");
    expect(screen.queryByText("記事11")).not.toBeInTheDocument();

    const sentinel = await screen.findByTestId("infinite-scroll-sentinel");
    triggerIntersect(sentinel);

    expect(await screen.findByText("記事11")).toBeInTheDocument();
    expect(screen.getByText("記事20")).toBeInTheDocument();
    expect(calls.map((c) => c.page)).toEqual([1, 2]);
  });

  it("retries the failed page when the user clicks the retry button", async () => {
    const calls: ListParams[] = [];
    const all = Array.from({ length: 15 }, (_, i) =>
      article(i + 1, `記事${i + 1}`),
    );
    let nextShouldFail = false;
    const api = fakeApi({
      listArticles: async (params) => {
        calls.push(params);
        if (nextShouldFail) {
          nextShouldFail = false;
          throw new Error("transient");
        }
        const page = params.page ?? 1;
        const perPage = params.perPage ?? 10;
        const start = (page - 1) * perPage;
        return {
          items: all.slice(start, start + perPage),
          page,
          perPage,
          total: all.length,
        };
      },
    });
    renderHome(api);

    await screen.findByText("記事10");
    nextShouldFail = true;
    const sentinel = await screen.findByTestId("infinite-scroll-sentinel");
    triggerIntersect(sentinel);

    const retry = await screen.findByRole("button", { name: "もう一度試す" });
    await userEvent.click(retry);

    expect(await screen.findByText("記事11")).toBeInTheDocument();
    expect(screen.getByText("記事15")).toBeInTheDocument();
    expect(calls.filter((c) => c.page === 2)).toHaveLength(2);
  });

  it("does not fetch more pages once everything is loaded", async () => {
    const calls: ListParams[] = [];
    const items = [article(1, "記事A"), article(2, "記事B")];
    const api = fakeApi({
      listArticles: async (params) => {
        calls.push(params);
        return { items, page: 1, perPage: 10, total: items.length };
      },
    });
    renderHome(api);

    await screen.findByText("記事A");
    expect(
      screen.queryByTestId("infinite-scroll-sentinel"),
    ).not.toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });
});
