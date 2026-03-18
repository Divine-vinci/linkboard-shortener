import { BoardVisibility } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { boardListQuerySchema, createBoardSchema } from "./board";

describe("src/lib/validations/board.ts", () => {
  it("accepts valid board input and applies the default visibility", () => {
    expect(
      createBoardSchema.parse({
        name: "  Product Launch  ",
        description: "  Campaign assets and docs  ",
      }),
    ).toEqual({
      name: "Product Launch",
      description: "Campaign assets and docs",
      visibility: BoardVisibility.Private,
    });
  });

  it("rejects missing board names", () => {
    const result = createBoardSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toContain("Board name is required");
  });

  it("rejects invalid visibility values", () => {
    const result = createBoardSchema.safeParse({
      name: "Ideas",
      visibility: "FriendsOnly",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.visibility?.[0]).toContain("Invalid option");
  });

  it("allows explicit public and unlisted visibility", () => {
    expect(createBoardSchema.parse({ name: "Public board", visibility: BoardVisibility.Public })).toMatchObject({
      visibility: BoardVisibility.Public,
    });
    expect(
      createBoardSchema.parse({ name: "Hidden board", visibility: BoardVisibility.Unlisted }),
    ).toMatchObject({ visibility: BoardVisibility.Unlisted });
  });

  it("rejects names exceeding 100 characters", () => {
    const result = createBoardSchema.safeParse({ name: "A".repeat(101) });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name?.[0]).toContain("at most 100");
  });

  it("rejects descriptions exceeding 500 characters", () => {
    const result = createBoardSchema.safeParse({ name: "OK", description: "D".repeat(501) });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.description?.[0]).toContain("at most 500");
  });

  it("parses board list query params with defaults", () => {
    expect(boardListQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });
});
