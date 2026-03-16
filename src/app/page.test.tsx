import { vi } from "vitest";

vi.mock("@/src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    DATABASE_URL: "postgresql://localhost/test",
    REDIS_URL: "redis://localhost:6379",
    AUTH_SECRET: "test-secret",
    AUTH_URL: "http://localhost:3000",
  },
}));

import { render, screen } from "@testing-library/react";
import Home from "@/src/app/page";

describe("Home", () => {
  it("renders the foundation readiness message", () => {
    render(<Home />);

    expect(screen.getByText(/Linkboard foundation is ready for feature work/i)).toBeInTheDocument();
    expect(screen.getByText(/Validated app URL/i)).toBeInTheDocument();
  });
});
