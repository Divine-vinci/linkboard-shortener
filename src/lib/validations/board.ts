import { BoardVisibility } from "@prisma/client";
import { z } from "zod";

const MAX_BOARD_NAME_LENGTH = 100;
const MAX_BOARD_DESCRIPTION_LENGTH = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function emptyStringToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

const boardNameSchema = z
  .string({ error: "Board name is required" })
  .trim()
  .min(1, "Board name is required")
  .max(MAX_BOARD_NAME_LENGTH, `Board name must be at most ${MAX_BOARD_NAME_LENGTH} characters`);

const boardDescriptionSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .max(
      MAX_BOARD_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_BOARD_DESCRIPTION_LENGTH} characters`,
    )
    .optional(),
);

export const createBoardSchema = z.object({
  name: boardNameSchema,
  description: boardDescriptionSchema,
  visibility: z.nativeEnum(BoardVisibility).default(BoardVisibility.Private),
});

export const updateBoardSchema = z
  .object({
    name: boardNameSchema.optional(),
    description: z.preprocess(
      (value) => {
        if (typeof value === "string" && value.trim() === "") {
          return null;
        }

        if (typeof value === "string") {
          return value.trim();
        }

        return value;
      },
      z
        .string()
        .max(
          MAX_BOARD_DESCRIPTION_LENGTH,
          `Description must be at most ${MAX_BOARD_DESCRIPTION_LENGTH} characters`,
        )
        .nullable(),
    ).optional(),
    visibility: z.nativeEnum(BoardVisibility).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export const boardListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateBoardInput = z.output<typeof createBoardSchema>;
export type CreateBoardSchemaInput = z.input<typeof createBoardSchema>;
export type UpdateBoardInput = z.output<typeof updateBoardSchema>;
export type UpdateBoardSchemaInput = z.input<typeof updateBoardSchema>;
export type BoardListQuery = z.output<typeof boardListQuerySchema>;
