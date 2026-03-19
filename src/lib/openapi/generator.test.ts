// @vitest-environment node

import { describe, expect, it } from "vitest";

import { generateOpenApiDocument } from "@/lib/openapi/generator";

const expectedPaths = [
  "/api/v1/links",
  "/api/v1/links/{id}",
  "/api/v1/boards",
  "/api/v1/boards/{id}",
  "/api/v1/boards/{id}/links",
  "/api/v1/boards/{id}/links/{linkId}",
  "/api/v1/boards/{id}/links/reorder",
  "/api/v1/analytics/links/{id}",
  "/api/v1/analytics/boards/{id}",
  "/api/v1/user/profile",
  "/api/v1/user/api-keys",
  "/api/v1/user/api-keys/{id}",
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
] as const;

describe("src/lib/openapi/generator.ts", () => {
  it("generates a valid OpenAPI 3.1 document with all API routes", () => {
    const document = generateOpenApiDocument();

    expect(document.openapi).toBe("3.1.0");
    expect(Object.keys(document.paths).sort()).toEqual([...expectedPaths].sort());
    expect(document.tags.map((tag) => tag.name)).toEqual([
      "Links",
      "Boards",
      "Board Links",
      "Analytics",
      "User/API Keys",
      "Auth",
    ]);
  });

  it("documents bearer auth and rate limiting on protected endpoints", () => {
    const document = generateOpenApiDocument();
    const createLink = document.paths["/api/v1/links"].post;

    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(createLink?.security).toEqual([{ bearerAuth: [] }]);
    expect(createLink?.responses["429"]).toMatchObject({
      description: "Too many requests",
      headers: {
        "Retry-After": expect.any(Object),
      },
    });
  });

  it("uses the shared wrapper response shapes and auto-generated Zod schemas", () => {
    const document = generateOpenApiDocument();
    const successSchema = document.paths["/api/v1/links/{id}"].get?.responses["200"].content?.["application/json"].schema as Record<string, unknown>;
    const requestSchema = document.paths["/api/v1/auth/register"].post?.requestBody?.content?.["application/json"].schema as Record<string, unknown>;
    const registerSchema = document.components.schemas.registerSchema as Record<string, unknown>;

    expect(successSchema).toMatchObject({
      type: "object",
      required: ["data"],
      properties: {
        data: {
          type: "object",
        },
      },
    });
    expect(requestSchema).toMatchObject({ type: "object" });
    expect(registerSchema).toBeTruthy();
  });
});
