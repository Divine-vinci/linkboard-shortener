import { AppError } from "@/src/lib/errors";

export type SuccessResponse<T> = { data: T };
export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function successResponse<T>(data: T): SuccessResponse<T> {
  return { data };
}

export function errorResponse(
  error: AppError,
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(details ? { details } : {}),
    },
  };
}
