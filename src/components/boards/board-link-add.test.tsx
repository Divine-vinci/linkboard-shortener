import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BoardLinkAdd } from "./board-link-add";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

function buildBoardLink(overrides: Partial<Parameters<typeof BoardLinkAdd>[0]["initialLinks"][number]> = {}) {
  return {
    id: "bl-1",
    boardId: "board-123",
    linkId: "link-123",
    position: 0,
    addedAt: "2026-03-18T03:00:00.000Z",
    link: {
      id: "link-123",
      slug: "launch-docs",
      targetUrl: "https://example.com/docs",
      title: "Launch docs",
      tags: ["docs"],
      expiresAt: null,
    },
    ...overrides,
  };
}

describe("src/components/boards/board-link-add.tsx", () => {
  const now = new Date("2026-03-18T00:00:00.000Z");

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the existing board link list", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(
      <BoardLinkAdd
        boardId="board-123"
        initialLinks={[buildBoardLink()]}
      />,
    );

    expect(await screen.findByText("Launch docs")).toBeInTheDocument();
    expect(screen.getByText("launch-docs")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("renders metadata placeholders and accessibility list semantics", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(
      <BoardLinkAdd
        boardId="board-123"
        initialLinks={[buildBoardLink()]}
      />,
    );

    expect(await screen.findByRole("list", { name: "Board links" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("0 clicks")).toHaveClass("text-zinc-500");
    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
  });

  it.each([
    ["2026-03-17T23:59:59.000Z", "Expired", "text-rose-300"],
    ["2026-03-18T00:00:00.000Z", "Expiring soon", "text-amber-300"],
    ["2026-03-20T00:00:00.000Z", "Expiring soon", "text-amber-300"],
    ["2026-04-20T00:00:00.000Z", "Active", "text-emerald-300"],
  ])("renders %s as %s expiration state", async (expiresAt, label, className) => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(
      <BoardLinkAdd
        boardId="board-123"
        initialLinks={[buildBoardLink({ link: { ...buildBoardLink().link, expiresAt } })]}
      />,
    );

    expect(await screen.findByText(label)).toHaveClass(className);
    expect(screen.getByText("0 clicks")).toBeInTheDocument();
  });

  it("submits add-link requests", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "link-234",
              slug: "product-roadmap",
              targetUrl: "https://example.com/roadmap",
              title: "Product roadmap",
              tags: ["planning"],
              expiresAt: null,
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "bl-234",
            boardId: "board-123",
            linkId: "link-234",
            position: 1,
            addedAt: "2026-03-18T04:00:00.000Z",
          },
        }),
      } as Response);

    render(<BoardLinkAdd boardId="board-123" initialLinks={[]} />);

    await screen.findByText("Add link to board");
    fireEvent.change(screen.getByLabelText("Add link to board"), { target: { value: "link-234" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/boards/board-123/links",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Product roadmap")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("removes a link from the board", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      } as Response);

    render(
      <BoardLinkAdd
        boardId="board-123"
        initialLinks={[buildBoardLink()]}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Remove Launch docs" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/boards/board-123/links/link-123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Launch docs")).not.toBeInTheDocument();
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("reorders links with move controls and disables boundary buttons", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "bl-2",
              boardId: "board-123",
              linkId: "link-456",
              position: 0,
            },
            {
              id: "bl-1",
              boardId: "board-123",
              linkId: "link-123",
              position: 1,
            },
          ],
        }),
      } as Response);

    render(
      <BoardLinkAdd
        boardId="board-123"
        initialLinks={[
          buildBoardLink(),
          buildBoardLink({
            id: "bl-2",
            linkId: "link-456",
            position: 1,
            link: {
              id: "link-456",
              slug: "team-wiki",
              targetUrl: "https://example.com/wiki",
              title: "Team wiki",
              tags: ["ops"],
              expiresAt: null,
            },
          }),
        ]}
      />,
    );

    expect(await screen.findByLabelText("Move Launch docs up")).toBeDisabled();
    expect(screen.getByLabelText("Move Team wiki down")).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Move Launch docs down"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/boards/board-123/links/reorder",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ linkIds: ["link-456", "link-123"] }),
        }),
      );
    });

    expect(refreshMock).toHaveBeenCalled();
    const titles = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(titles[0]).toContain("Team wiki");
    expect(titles[1]).toContain("Launch docs");
  });

  it("reverts the optimistic reorder when the API fails", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: "Unable to reorder links right now.",
          },
        }),
      } as Response);

    render(
      <BoardLinkAdd
        boardId="board-123"
        initialLinks={[
          buildBoardLink(),
          buildBoardLink({
            id: "bl-2",
            linkId: "link-456",
            position: 1,
            link: {
              id: "link-456",
              slug: "team-wiki",
              targetUrl: "https://example.com/wiki",
              title: "Team wiki",
              tags: ["ops"],
              expiresAt: null,
            },
          }),
        ]}
      />,
    );

    fireEvent.click(await screen.findByLabelText("Move Launch docs down"));

    await waitFor(() => {
      expect(screen.getByText("Unable to reorder links right now.")).toBeInTheDocument();
    });

    const titles = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(titles[0]).toContain("Launch docs");
    expect(titles[1]).toContain("Team wiki");
  });
});
