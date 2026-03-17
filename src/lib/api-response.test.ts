import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

describe("api-response helpers", () => {
  it("wraps successful payloads in a data envelope", () => {
    expect(successResponse({ ok: true })).toEqual({ data: { ok: true } });
  });

  it("wraps app errors in a structured error envelope", () => {
    const response = errorResponse(
      new AppError("VALIDATION_ERROR", "Invalid payload", 400),
      { field: "slug" },
    );

    expect(response).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid payload",
        details: { field: "slug" },
      },
    });
  });
});
