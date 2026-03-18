// @vitest-environment node

import { BoardVisibility } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/boards", () => ({
  deleteBoard: vi.fn(),
  findBoardSummaryById: vi.fn(),
  updateBoard: vi.fn(),
}));

const { DELETE, GET, PATCH } = await import("@/app/api/v1/boards/[id]/route");
const authModule = await import("@/lib/auth/config");
const boardsModule = await import("@/lib/db/boards");

const mockedAuth = authModule.auth as Mock;

function buildBoard(overrides: Partial<Record<string, unknown>> = {}) {
  const createdAt = new Date("2026-03-18T02:00:00.000Z");

  return {
    id: "board-123",
    name: "Ideas",
    slug: "ideas",
    description: "Product notes",
    visibility: BoardVisibility.Public,
    userId: "user-123",
    createdAt,
    updatedAt: createdAt,
    _count: {
      boardLinks: 2,
    },
    ...overrides,
  };
}

describe("src/app/api/v1/boards/[id]/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an owned board", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard());

    const response = await GET(
      new Request("http://localhost:3000/api/v1/boards/board-123"),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(200);
    expect(boardsModule.findBoardSummaryById).toHaveBeenCalledWith("board-123");
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "board-123",
        name: "Ideas",
        slug: "ideas",
        description: "Product notes",
        visibility: BoardVisibility.Public,
        userId: "user-123",
        createdAt: "2026-03-18T02:00:00.000Z",
        updatedAt: "2026-03-18T02:00:00.000Z",
        _count: { boardLinks: 2 },
      },
    });
  });

  it("returns 404 for boards not owned by the session user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardSummaryById).mockResolvedValue(buildBoard({ userId: "user-999" }));

    const response = await GET(
      new Request("http://localhost:3000/api/v1/boards/board-123"),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Board not found",
      },
    });
  });

  it("updates a board and preserves the slug", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.updateBoard).mockResolvedValue(
      buildBoard({ name: "Renamed board", slug: "ideas", visibility: BoardVisibility.Private }),
    );

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/board-123", {
        method: "PATCH",
        body: JSON.stringify({
          name: "  Renamed board  ",
          visibility: BoardVisibility.Private,
        }),
      }),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(200);
    expect(boardsModule.updateBoard).toHaveBeenCalledWith("board-123", "user-123", {
      name: "Renamed board",
      visibility: BoardVisibility.Private,
    });
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({
        name: "Renamed board",
        slug: "ideas",
        visibility: BoardVisibility.Private,
      }),
    });
  });

  it("returns 400 for invalid board update payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/board-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid board update input",
        details: {
          fields: {
            name: "Board name is required",
          },
        },
      },
    });
    expect(boardsModule.updateBoard).not.toHaveBeenCalled();
  });

  it("returns 400 for empty board update payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/board-123", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid board update input",
        details: {
          fields: {
            _form: "At least one field must be provided",
          },
        },
      },
    });
  });

  it("returns 404 when updating a board that does not exist or is not owned", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.updateBoard).mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/board-404", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ id: "board-404" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Board not found",
      },
    });
  });

  it("deletes an owned board with a 204 response", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.deleteBoard).mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/board-123", { method: "DELETE" }),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(204);
    expect(boardsModule.deleteBoard).toHaveBeenCalledWith("board-123", "user-123");
    expect(await response.text()).toBe("");
  });

  it("returns 404 when deleting a board that does not exist or is not owned", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.deleteBoard).mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/board-404", { method: "DELETE" }),
      { params: Promise.resolve({ id: "board-404" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Board not found",
      },
    });
  });

  it("returns 400 for malformed JSON in PATCH body", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/board-123", {
        method: "PATCH",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Request body must be valid JSON",
      },
    });
    expect(boardsModule.updateBoard).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated board requests", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const getResponse = await GET(
      new Request("http://localhost:3000/api/v1/boards/board-123"),
      { params: Promise.resolve({ id: "board-123" }) },
    );
    const patchResponse = await PATCH(
      new Request("http://localhost:3000/api/v1/boards/board-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Nope" }),
      }),
      { params: Promise.resolve({ id: "board-123" }) },
    );
    const deleteResponse = await DELETE(
      new Request("http://localhost:3000/api/v1/boards/board-123", { method: "DELETE" }),
      { params: Promise.resolve({ id: "board-123" }) },
    );

    expect(getResponse.status).toBe(401);
    expect(patchResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });
});
