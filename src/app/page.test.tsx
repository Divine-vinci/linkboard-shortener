import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("does not redirect unauthenticated visitors", async () => {
    const { auth } = await import("@/lib/auth/config");
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // Render the async server component
    const result = await HomePage();

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("redirects authenticated users to /dashboard", async () => {
    const { auth } = await import("@/lib/auth/config");
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "u1", email: "test@example.com" },
    });

    try {
      await HomePage();
    } catch {
      // redirect throws in test environment
    }

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
