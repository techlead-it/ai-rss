import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox } from "./SearchBox";

describe("SearchBox", () => {
  it("submits the trimmed query", async () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} />);
    await userEvent.type(screen.getByLabelText("記事を検索"), "  インジェクション  ");
    await userEvent.click(screen.getByRole("button", { name: "検索" }));
    expect(onSearch).toHaveBeenCalledWith("インジェクション");
  });

  it("prefills the initial value", () => {
    render(<SearchBox initialValue="ジェイルブレイク" onSearch={vi.fn()} />);
    expect(screen.getByLabelText("記事を検索")).toHaveValue("ジェイルブレイク");
  });
});
