import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/theme";
import { MedGemmaButton } from "./Button";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe("MedGemmaButton", () => {
  it("renders children", () => {
    renderWithTheme(<MedGemmaButton>Start Screening</MedGemmaButton>);
    expect(screen.getByRole("button", { name: /start screening/i })).toBeInTheDocument();
  });

  it("responds to click", async () => {
    const onClick = vi.fn();
    renderWithTheme(<MedGemmaButton onClick={onClick}>Click me</MedGemmaButton>);
    await userEvent.click(screen.getByRole("button", { name: /click me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire click when disabled", async () => {
    const onClick = vi.fn();
    renderWithTheme(
      <MedGemmaButton onClick={onClick} disabled>
        Disabled
      </MedGemmaButton>
    );
    await userEvent.click(screen.getByRole("button", { name: /disabled/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
