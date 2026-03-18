import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsNav } from "@/components/settings/settings-nav";

describe("src/components/settings/settings-nav.tsx", () => {
  it("renders profile and API key navigation items", () => {
    render(<SettingsNav currentPath="/dashboard/settings/api-keys" />);

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/dashboard/settings");
    expect(screen.getByRole("link", { name: "API Keys" })).toHaveAttribute("href", "/dashboard/settings/api-keys");
    expect(screen.getByRole("link", { name: "API Keys" })).toHaveAttribute("aria-current", "page");
  });
});
