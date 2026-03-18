import type { ZodError } from "zod";

export function fieldErrorsFromZod(error: ZodError) {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  const entries = Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0] ?? "Invalid value"]);

  if (flattened.formErrors[0]) {
    entries.push(["_form", flattened.formErrors[0]]);
  }

  return Object.fromEntries(entries);
}
