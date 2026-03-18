import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  findRecentLinksByUserIdMock,
  findBoardsByUserIdMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  findRecentLinksByUserIdMock: vi.fn(),
  findBoardsByUserIdMock: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  auth: authMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/db/links", () => ({
  findRecentLinksByUserId: findRecentLinksByUserIdMock,
}));

vi.mock("@/lib/db/boards", () => ({
  findBoardsByUserId: findBoardsByUserIdMock,
}));

import DashboardPage from "@/app/(dashboard)/page";

describe("src/app/(dashboard)/page.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users", async () => {
    authMock.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("renders the empty state when the user has no links and no boards", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findRecentLinksByUserIdMock.mockResolvedValue([]);
    findBoardsByUserIdMock.mockResolvedValue([]);

    render(await DashboardPage());

    expect(screen.getByText("Your dashboard is ready")).toBeInTheDocument();
    expect(screen.queryByText("Recent links")).not.toBeInTheDocument();
  });

  it("renders quick actions, recent links, and boards overview", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findRecentLinksByUserIdMock.mockResolvedValue([
      {
        id: "link-1",
        slug: "alpha",
        title: "Alpha",
        targetUrl: "https://example.com/alpha",
        createdAt: new Date(Date.now() - 60_000),
      },
    ]);
    findBoardsByUserIdMock.mockResolvedValue([
      {
        id: "board-1",
        name: "Launch",
        visibility: "Public",
        _count: { boardLinks: 2 },
      },
    ]);

    render(await DashboardPage());

    expect(findRecentLinksByUserIdMock).toHaveBeenCalledWith("user-1", 5);
    expect(findBoardsByUserIdMock).toHaveBeenCalledWith("user-1");
    expect(screen.getByText("Quick actions")).toBeInTheDocument();
    expect(screen.getByText("Recent links")).toBeInTheDocument();
    expect(screen.getByText("Boards overview")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Launch")).toBeInTheDocument();
  });
});
