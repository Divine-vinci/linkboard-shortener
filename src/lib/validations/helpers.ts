import type { ZodError } from "zod";

export function fieldErrorsFromZod(error: ZodError) {
  const flattened = error.flatten().fieldErrors as Record<string, string[] | undefined>;

  return Object.fromEntries(
    Object.entries(flattened).map(([field, messages]) => [field, messages?.[0] ?? "Invalid value"]),
  );
}
