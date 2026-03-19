// @vitest-environment node

import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/docs/route";

describe("src/app/api/docs/route.ts", () => {
  it("returns the Swagger UI HTML", async () => {
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("swagger-ui");
    expect(html).toContain("/api/docs/openapi.json");
    expect(html).toContain("SwaggerUIBundle");
  });
});
