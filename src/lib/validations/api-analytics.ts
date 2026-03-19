import { z } from "zod";

export const analyticsQuerySchema = z.object({
  granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

export type AnalyticsQuery = z.output<typeof analyticsQuerySchema>;
