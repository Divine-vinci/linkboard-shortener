import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import { BottomNav } from "@/components/layout/bottom-nav";

describe("src/components/layout/bottom-nav.tsx", () => {
  it("renders all nav items with 44px touch targets", () => {
    usePathnameMock.mockReturnValue("/dashboard/links");

    render(<BottomNav />);

    const linksLink = screen.getByRole("link", { name: "Links", current: "page" });

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Boards" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(linksLink.className).toContain("min-h-[44px]");
    expect(linksLink.className).toContain("min-w-[44px]");
  });

  it("applies active state to nested links routes", () => {
    usePathnameMock.mockReturnValue("/dashboard/links/new");

    render(<BottomNav />);

    expect(screen.getByRole("link", { name: "Links", current: "page" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Boards", current: "page" })).not.toBeInTheDocument();
  });
});
