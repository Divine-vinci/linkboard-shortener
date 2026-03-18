import { describe, expect, it } from "vitest";

import { metadata } from "@/app/expired/page";

describe("src/app/expired/page.tsx", () => {
  it("marks the expired utility page as noindex, nofollow", () => {
    expect(metadata).toMatchObject({
      title: "Link expired — Linkboard",
      robots: {
        index: false,
        follow: false,
      },
    });
  });
});
