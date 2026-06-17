import { describe, it, expect } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SourcesPage } from "./SourcesPage";
import { ApiProvider } from "../api/context";
import type { ApiClient } from "../api/client";
import type { SourceDto } from "../../pipeline/types";

const sources: SourceDto[] = [
  {
    source: "Embrace The Red",
    url: "https://embracethered.com/blog/index.xml",
    kind: "専門",
    filtered: false,
    count: 4,
  },
  {
    source: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    kind: "ニュース",
    filtered: true,
    count: 0,
  },
];

function fakeApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    listArticles: async () => ({ items: [], page: 1, perPage: 50, total: 0 }),
    getArticle: async () => null,
    listLabels: async () => [],
    listCategories: async () => [],
    listSources: async () => sources,
    ...overrides,
  };
}

function renderSources(api: ApiClient) {
  return render(
    <ApiProvider client={api}>
      <MemoryRouter initialEntries={["/sources"]}>
        <SourcesPage />
      </MemoryRouter>
    </ApiProvider>,
  );
}

describe("SourcesPage", () => {
  it("lists each source with its kind, collected count and feed link", async () => {
    renderSources(fakeApi());
    expect(await screen.findByText("Embrace The Red")).toBeInTheDocument();
    expect(screen.getByText("専門")).toBeInTheDocument();
    expect(screen.getByText("4 件")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "https://embracethered.com/blog/index.xml",
      }),
    ).toHaveAttribute("href", "https://embracethered.com/blog/index.xml");
  });

  it("marks keyword-filtered sources", async () => {
    renderSources(fakeApi());
    await screen.findByText("The Hacker News");
    expect(
      screen.getByText("AI 関連キーワードで絞り込み"),
    ).toBeInTheDocument();
  });
});
