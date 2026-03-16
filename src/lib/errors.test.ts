import { describe, expect, it } from "vitest";
import { AppError } from "@/src/lib/errors";

describe("AppError", () => {
  it("extends Error with code and statusCode", () => {
    const err = new AppError("NOT_FOUND", "Resource not found", 404);

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
    expect(err.statusCode).toBe(404);
  });

  it("captures a stack trace", () => {
    const err = new AppError("INTERNAL", "Something broke", 500);
    expect(err.stack).toBeDefined();
  });
});
