import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(async () => ({
    user: {
      email: "vinci@example.com",
    },
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

import DashboardLayout from "@/app/(dashboard)/layout";

describe("src/app/(dashboard)/layout.tsx", () => {
  it("renders sidebar and bottom navigation wrappers for responsive layouts", async () => {
    const layout = await DashboardLayout({
      children: <div>Child content</div>,
    });

    render(layout);

    const navs = screen.getAllByLabelText("Dashboard navigation");

    expect(navs).toHaveLength(3);
    expect(screen.getByText("Child content")).toBeInTheDocument();
    expect(navs[0].closest("aside")).toHaveClass("hidden", "lg:flex");
    expect(navs[1].closest("aside")).toHaveClass("hidden", "md:flex", "lg:hidden");
    expect(navs[2]).toHaveClass("fixed", "md:hidden");
  });
});
