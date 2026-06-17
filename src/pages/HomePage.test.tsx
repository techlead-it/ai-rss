import { describe, it, expect } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("renders the placeholder heading when mounted", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /Hello, demo-site-template/i }),
    ).toBeInTheDocument();
  });
});
