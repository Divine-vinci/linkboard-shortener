import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

import { SidebarNav } from "@/components/layout/sidebar-nav";

describe("src/components/layout/sidebar-nav.tsx", () => {
  it("renders all dashboard navigation items and user email on desktop", () => {
    usePathnameMock.mockReturnValue("/dashboard/boards");

    render(<SidebarNav userEmail="vinci@example.com" />);

    expect(screen.getAllByLabelText("Dashboard navigation")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Links" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Boards" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Analytics" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Settings" })).toHaveLength(2);
    expect(screen.getAllByText("vinci@example.com")).toHaveLength(2);
  });

  it("marks nested routes as active with aria-current", () => {
    usePathnameMock.mockReturnValue("/dashboard/boards/board-123");

    render(<SidebarNav userEmail="vinci@example.com" />);

    expect(screen.getAllByRole("link", { name: "Boards", current: "page" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Links", current: "page" })).not.toBeInTheDocument();
  });

  it("keeps links keyboard focusable and toggles tablet expansion", () => {
    usePathnameMock.mockReturnValue("/dashboard");

    render(<SidebarNav userEmail="vinci@example.com" />);

    const desktopDashboardLink = screen.getAllByRole("link", { name: "Dashboard" })[0];
    desktopDashboardLink.focus();
    expect(desktopDashboardLink).toHaveFocus();

    const toggleButton = screen.getByRole("button", { name: "Expand sidebar" });
    fireEvent.click(toggleButton);

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });
});
