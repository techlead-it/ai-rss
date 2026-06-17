import { describe, it, expect } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { HomePage } from "./HomePage";
import { ApiProvider } from "../api/context";
import type { ApiClient, ListParams } from "../api/client";
import type { ArticleDto, ArticleListResponse } from "../../pipeline/types";

function article(id: number, title: string, labelSlug?: string): ArticleDto {
  return {
    id,
    title,
    source: "Test",
    url: `https://example.com/${id}`,
    category: { name: "セキュリティ", slug: "security" },
    labels: labelSlug
      ? [{ name: labelSlug, slug: labelSlug }]
      : [],
    summary: `${title} の要約`,
    detail: "- 要点",
    publishedAt: "2026-06-17T00:00:00Z",
    fetchFailed: false,
  };
}

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    listArticles: async () => ({ items: [], page: 1, perPage: 50, total: 0 }),
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
        perPage: 50,
        total: 2,
      }),
    });
    renderHome(api);
    expect(await screen.findByText("記事A")).toBeInTheDocument();
    expect(screen.getByText("記事B")).toBeInTheDocument();
  });

  it("shows a loading state initially", () => {
    const api = fakeApi({ listArticles: () => new Promise<ArticleListResponse>(() => {}) });
    renderHome(api);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });

  it("shows an empty state when there are no articles", async () => {
    renderHome(fakeApi());
    expect(await screen.findByText("該当する記事がありません。")).toBeInTheDocument();
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
        return { items, page: 1, perPage: 50, total: items.length };
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
        return { items: [], page: 1, perPage: 50, total: 0 };
      },
    });
    renderHome(api);
    await userEvent.type(screen.getByLabelText("記事を検索"), "ポイズニング");
    await userEvent.click(screen.getByRole("button", { name: "検索" }));
    await waitFor(() =>
      expect(calls.some((c) => c.q === "ポイズニング")).toBe(true),
    );
  });
});
