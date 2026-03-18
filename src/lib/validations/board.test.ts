import { BoardVisibility } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  addBoardLinkSchema,
  boardListQuerySchema,
  createBoardSchema,
  reorderBoardLinksSchema,
  updateBoardSchema,
} from "./board";

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

  it("accepts partial board updates", () => {
    expect(updateBoardSchema.parse({ name: "  Renamed board  " })).toEqual({
      name: "Renamed board",
    });
    expect(updateBoardSchema.parse({ visibility: BoardVisibility.Public })).toEqual({
      visibility: BoardVisibility.Public,
    });
  });

  it("accepts null description to clear an existing description", () => {
    expect(updateBoardSchema.parse({ description: null })).toEqual({ description: null });
  });

  it("rejects empty update payloads", () => {
    const result = updateBoardSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.flatten().formErrors).toContain("At least one field must be provided");
  });

  it("rejects empty update names", () => {
    const result = updateBoardSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toContain("Board name is required");
  });

  it("rejects descriptions exceeding 500 characters on update", () => {
    const result = updateBoardSchema.safeParse({ description: "D".repeat(501) });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.description?.[0]).toContain("at most 500");
  });

  it("accepts a valid board-link payload", () => {
    expect(
      addBoardLinkSchema.parse({
        linkId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      linkId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("rejects an invalid board-link payload", () => {
    const result = addBoardLinkSchema.safeParse({ linkId: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.linkId).toContain("Select a valid link");
  });

  it("accepts a valid reorder payload", () => {
    expect(
      reorderBoardLinksSchema.parse({
        linkIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
      }),
    ).toEqual({
      linkIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
  });

  it("rejects empty reorder payloads", () => {
    const result = reorderBoardLinksSchema.safeParse({ linkIds: [] });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.linkIds).toContain("Select at least one link");
  });

  it("rejects invalid reorder ids", () => {
    const result = reorderBoardLinksSchema.safeParse({ linkIds: ["not-a-uuid"] });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.linkIds).toContain("Select valid links");
  });

  it("parses board list query params with defaults", () => {
    expect(boardListQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });
});
