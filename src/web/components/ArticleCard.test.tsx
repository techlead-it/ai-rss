import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ArticleCard } from "./ArticleCard";
import type { ArticleDto } from "../../pipeline/types";

const article: ArticleDto = {
  id: 7,
  title: "プロンプトインジェクションの新手法",
  source: "Embrace The Red",
  url: "https://example.com/post",
  category: { name: "セキュリティ", slug: "security" },
  labels: [{ name: "プロンプトインジェクション", slug: "prompt-injection" }],
  summary: "ガードレールを回避する新手法の要約。",
  detail: "- 要点1\n- 要点2",
  publishedAt: "2026-06-17T09:00:00Z",
  fetchFailed: false,
};

function renderCard(props: Partial<Parameters<typeof ArticleCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ArticleCard article={article} {...props} />
    </MemoryRouter>,
  );
}

describe("ArticleCard", () => {
  it("shows the title, source, date, summary and links to the detail page", () => {
    renderCard();
    expect(screen.getByText("プロンプトインジェクションの新手法")).toBeInTheDocument();
    expect(screen.getByText("Embrace The Red")).toBeInTheDocument();
    expect(screen.getByText("2026/06/17")).toBeInTheDocument();
    expect(
      screen.getByText("ガードレールを回避する新手法の要約。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /プロンプトインジェクションの新手法/ }),
    ).toHaveAttribute("href", "/articles/7");
  });

  it("calls onLabelClick with the slug when a label chip is clicked", async () => {
    const onLabelClick = vi.fn();
    renderCard({ onLabelClick });
    await userEvent.click(
      screen.getByRole("button", { name: "プロンプトインジェクション" }),
    );
    expect(onLabelClick).toHaveBeenCalledWith("prompt-injection");
  });

  it("shows an excerpt-based badge when the body fetch failed", () => {
    render(
      <MemoryRouter>
        <ArticleCard article={{ ...article, fetchFailed: true }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("抜粋ベース")).toBeInTheDocument();
  });
});
