// @vitest-environment node

import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/docs/openapi.json/route";

describe("src/app/api/docs/openapi.json/route.ts", () => {
  it("returns the generated OpenAPI JSON document", async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.openapi).toBe("3.1.0");
    expect(json.paths["/api/v1/links"]).toBeTruthy();
    expect(json.paths["/api/v1/user/api-keys"]).toBeTruthy();
  });
});
