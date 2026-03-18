// @vitest-environment node

import { BoardVisibility } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/boards", () => ({
  countBoardsByUserId: vi.fn(),
  createBoard: vi.fn(),
  findBoardsByUserId: vi.fn(),
}));

const { GET, POST } = await import("@/app/api/v1/boards/route");
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

describe("src/app/api/v1/boards/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a board and returns 201", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.createBoard).mockResolvedValue(buildBoard());

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards", {
        method: "POST",
        body: JSON.stringify({
          name: "  Ideas  ",
          description: "  Product notes  ",
          visibility: "Public",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(boardsModule.createBoard).toHaveBeenCalledWith({
      name: "Ideas",
      description: "Product notes",
      visibility: BoardVisibility.Public,
      userId: "user-123",
    });
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
        _count: {
          boardLinks: 2,
        },
      },
    });
  });

  it("returns 400 for invalid board payloads", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards", {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid board input",
        details: {
          fields: {
            name: "Board name is required",
          },
        },
      },
    });
  });

  it("returns 401 when creating a board without authentication", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/v1/boards", {
        method: "POST",
        body: JSON.stringify({ name: "Ideas" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns paginated boards for the authenticated user", async () => {
    vi.mocked(mockedAuth).mockResolvedValue({
      user: { id: "user-123", email: "user@example.com" },
      expires: "2026-03-18T18:00:00.000Z",
    });
    vi.mocked(boardsModule.findBoardsByUserId).mockResolvedValue([
      buildBoard(),
      buildBoard({ id: "board-456", slug: "work", name: "Work", _count: { boardLinks: 0 } }),
    ]);
    vi.mocked(boardsModule.countBoardsByUserId).mockResolvedValue(2);

    const response = await GET(
      new Request("http://localhost:3000/api/v1/boards?limit=10&offset=5"),
    );

    expect(response.status).toBe(200);
    expect(boardsModule.findBoardsByUserId).toHaveBeenCalledWith("user-123", { limit: 10, offset: 5 });
    expect(boardsModule.countBoardsByUserId).toHaveBeenCalledWith("user-123");
    await expect(response.json()).resolves.toEqual({
      data: [
        {
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
        {
          id: "board-456",
          name: "Work",
          slug: "work",
          description: "Product notes",
          visibility: BoardVisibility.Public,
          userId: "user-123",
          createdAt: "2026-03-18T02:00:00.000Z",
          updatedAt: "2026-03-18T02:00:00.000Z",
          _count: { boardLinks: 0 },
        },
      ],
      pagination: {
        total: 2,
        limit: 10,
        offset: 5,
      },
    });
  });

  it("returns 401 when listing boards without authentication", async () => {
    vi.mocked(mockedAuth).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/v1/boards"));

    expect(response.status).toBe(401);
  });
});
