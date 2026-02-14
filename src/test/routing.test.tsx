import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter } from "react-router-dom";
import App, { appRoutes } from "../App";

function renderWithRouter(initialPath = "/") {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  return render(<App router={router} />);
}

describe("Routing", () => {
  it("renders home page at /", () => {
    renderWithRouter("/");
    expect(screen.getByText(/PediScreen/i)).toBeInTheDocument();
  });

  it("renders dashboard at /dashboard", () => {
    renderWithRouter("/dashboard");
    expect(screen.getByRole("heading", { name: /Dashboard/i })).toBeInTheDocument();
  });

  it("renders case queue at /cases", () => {
    renderWithRouter("/cases");
    expect(screen.getByRole("heading", { name: /Case Queue/i })).toBeInTheDocument();
  });

  it("renders login page at /auth/login", () => {
    renderWithRouter("/auth/login");
    expect(screen.getByRole("heading", { name: /Log in/i })).toBeInTheDocument();
  });

  it("renders signup page at /auth/signup", () => {
    renderWithRouter("/auth/signup");
    expect(screen.getByRole("heading", { name: /Sign up/i })).toBeInTheDocument();
  });

  it("renders profile page at /profile", () => {
    renderWithRouter("/profile");
    expect(screen.getByRole("heading", { name: /Account/i })).toBeInTheDocument();
  });

  it("renders reports page at /reports", () => {
    renderWithRouter("/reports");
    expect(screen.getByText(/Reports/i)).toBeInTheDocument();
  });

  it("has Dashboard link in nav", () => {
    renderWithRouter("/dashboard");
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
