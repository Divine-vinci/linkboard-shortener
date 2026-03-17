import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
