import type { ZodType } from "zod";
import { z } from "zod";

import { schemas } from "@/lib/openapi/registry";

const API_TITLE = "Linkboard API";
const API_VERSION = "1.0.0";
const API_DESCRIPTION = "Interactive OpenAPI documentation for Linkboard's REST API.";

type HttpMethod = "get" | "post" | "patch" | "delete";
type SecurityRequirement = { bearerAuth?: string[]; sessionAuth?: string[] };

type SchemaObject = Record<string, unknown>;
type MediaTypeObject = { schema: SchemaObject };
type ResponseObject = {
  description: string;
  headers?: Record<string, unknown>;
  content?: {
    "application/json": MediaTypeObject;
  };
};

type OperationObject = {
  tags: string[];
  summary: string;
  description?: string;
  operationId: string;
  security?: SecurityRequirement[];
  parameters?: Record<string, unknown>[];
  requestBody?: {
    required: boolean;
    content: {
      "application/json": MediaTypeObject;
    };
  };
  responses: Record<string, ResponseObject>;
};

type PathItemObject = Partial<Record<HttpMethod, OperationObject>>;

type EndpointDefinition = {
  path: string;
  method: HttpMethod;
  operation: OperationObject;
};

function schemaFromZod(schema: ZodType, reused?: string): SchemaObject {
  const jsonSchema = z.toJSONSchema(schema, {
    io: "input",
    ...(reused ? { reused: "ref" as const } : {}),
  }) as SchemaObject;

  if (reused) {
    return {
      $ref: `#/components/schemas/${reused}`,
    };
  }

  return jsonSchema;
}

function successResponseSchema(schema: ZodType): SchemaObject {
  return schemaFromZod(z.object({ data: schema }));
}

function listResponseSchema(itemSchema: ZodType): SchemaObject {
  return schemaFromZod(
    z.object({
      data: z.array(itemSchema),
      pagination: schemas.paginationSchema,
    }),
  );
}

function errorRef(): SchemaObject {
  return { $ref: "#/components/schemas/errorResponseSchema" };
}

function jsonResponse(description: string, schema: SchemaObject): ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

function noContentResponse(description: string): ResponseObject {
  return { description };
}

function errorJsonResponse(description: string): ResponseObject {
  return jsonResponse(description, errorRef());
}

function rateLimitedResponse(): ResponseObject {
  return {
    description: "Too many requests",
    headers: {
      "Retry-After": {
        description: "Seconds until the caller may retry",
        schema: {
          type: "string",
        },
      },
    },
    content: {
      "application/json": {
        schema: errorRef(),
      },
    },
  };
}

function uuidPathParameter(name: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: schemaFromZod(z.uuid()),
  };
}

function queryParameter(name: string, schema: ZodType, description?: string) {
  return {
    name,
    in: "query",
    required: false,
    ...(description ? { description } : {}),
    schema: schemaFromZod(schema),
  };
}

function requestBody(schema: ZodType) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: schemaFromZod(schema),
      },
    },
  };
}

function protectedResponses(success: Record<string, ResponseObject>, extra?: Record<string, ResponseObject>) {
  return {
    ...success,
    ...(extra ?? {}),
    "401": errorJsonResponse("Authentication required"),
    "429": rateLimitedResponse(),
    "500": errorJsonResponse("Unexpected server error"),
  } satisfies Record<string, ResponseObject>;
}

function sessionResponses(success: Record<string, ResponseObject>, extra?: Record<string, ResponseObject>) {
  return {
    ...success,
    ...(extra ?? {}),
    "401": errorJsonResponse("Authentication required"),
    "429": rateLimitedResponse(),
    "500": errorJsonResponse("Unexpected server error"),
  } satisfies Record<string, ResponseObject>;
}

function authResponses(success: Record<string, ResponseObject>, extra?: Record<string, ResponseObject>) {
  return {
    ...success,
    ...(extra ?? {}),
    "400": errorJsonResponse("Invalid request"),
    "500": errorJsonResponse("Unexpected server error"),
  } satisfies Record<string, ResponseObject>;
}

function protectedOperation(definition: Omit<EndpointDefinition, "operation"> & {
  tag: string;
  summary: string;
  description?: string;
  operationId: string;
  parameters?: Record<string, unknown>[];
  requestSchema?: ZodType;
  responses: Record<string, ResponseObject>;
}) {
  return {
    path: definition.path,
    method: definition.method,
    operation: {
      tags: [definition.tag],
      summary: definition.summary,
      ...(definition.description ? { description: definition.description } : {}),
      operationId: definition.operationId,
      security: [{ bearerAuth: [] }],
      ...(definition.parameters ? { parameters: definition.parameters } : {}),
      ...(definition.requestSchema ? { requestBody: requestBody(definition.requestSchema) } : {}),
      responses: protectedResponses(definition.responses),
    },
  } satisfies EndpointDefinition;
}

function sessionOperation(definition: Omit<EndpointDefinition, "operation"> & {
  tag: string;
  summary: string;
  description?: string;
  operationId: string;
  parameters?: Record<string, unknown>[];
  requestSchema?: ZodType;
  responses: Record<string, ResponseObject>;
}) {
  return {
    path: definition.path,
    method: definition.method,
    operation: {
      tags: [definition.tag],
      summary: definition.summary,
      ...(definition.description ? { description: definition.description } : {}),
      operationId: definition.operationId,
      security: [{ sessionAuth: [] }],
      ...(definition.parameters ? { parameters: definition.parameters } : {}),
      ...(definition.requestSchema ? { requestBody: requestBody(definition.requestSchema) } : {}),
      responses: sessionResponses(definition.responses),
    },
  } satisfies EndpointDefinition;
}

function authOperation(definition: Omit<EndpointDefinition, "operation"> & {
  tag: string;
  summary: string;
  description?: string;
  operationId: string;
  requestSchema?: ZodType;
  responses: Record<string, ResponseObject>;
}) {
  return {
    path: definition.path,
    method: definition.method,
    operation: {
      tags: [definition.tag],
      summary: definition.summary,
      ...(definition.description ? { description: definition.description } : {}),
      operationId: definition.operationId,
      ...(definition.requestSchema ? { requestBody: requestBody(definition.requestSchema) } : {}),
      responses: authResponses(definition.responses),
    },
  } satisfies EndpointDefinition;
}

const endpointDefinitions: EndpointDefinition[] = [
  protectedOperation({
    path: "/api/v1/links",
    method: "get",
    tag: "Links",
    summary: "List links",
    operationId: "listLinks",
    parameters: [
      queryParameter("search", schemas.apiListLinksQuerySchema.shape.search, "Optional search query."),
      queryParameter("sortBy", schemas.apiListLinksQuerySchema.shape.sortBy),
      queryParameter("limit", schemas.apiListLinksQuerySchema.shape.limit),
      queryParameter("offset", schemas.apiListLinksQuerySchema.shape.offset),
    ],
    responses: {
      "200": jsonResponse("Paginated links", listResponseSchema(schemas.linkResponseSchema)),
      "400": errorJsonResponse("Invalid link query"),
    },
  }),
  protectedOperation({
    path: "/api/v1/links",
    method: "post",
    tag: "Links",
    summary: "Create link",
    operationId: "createLink",
    description: "Provide an API slug in the `slug` field. The API also accepts the dashboard-only `customSlug` alias.",
    requestSchema: schemas.apiCreateLinkSchema,
    responses: {
      "201": jsonResponse("Created link", successResponseSchema(schemas.linkResponseSchema)),
      "400": errorJsonResponse("Invalid link input"),
      "409": errorJsonResponse("Custom slug already exists or the board is invalid"),
    },
  }),
  protectedOperation({
    path: "/api/v1/links/{id}",
    method: "get",
    tag: "Links",
    summary: "Get link",
    operationId: "getLink",
    parameters: [uuidPathParameter("id", "Link ID")],
    responses: {
      "200": jsonResponse("Link details", successResponseSchema(schemas.linkResponseSchema)),
      "404": errorJsonResponse("Link not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/links/{id}",
    method: "patch",
    tag: "Links",
    summary: "Update link",
    operationId: "updateLink",
    parameters: [uuidPathParameter("id", "Link ID")],
    requestSchema: schemas.apiUpdateLinkSchema,
    responses: {
      "200": jsonResponse("Updated link", successResponseSchema(schemas.linkResponseSchema)),
      "400": errorJsonResponse("Invalid link update input"),
      "404": errorJsonResponse("Link not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/links/{id}",
    method: "delete",
    tag: "Links",
    summary: "Delete link",
    operationId: "deleteLink",
    parameters: [uuidPathParameter("id", "Link ID")],
    responses: {
      "204": noContentResponse("Link deleted"),
      "404": errorJsonResponse("Link not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards",
    method: "get",
    tag: "Boards",
    summary: "List boards",
    operationId: "listBoards",
    parameters: [
      queryParameter("limit", schemas.boardListQuerySchema.shape.limit),
      queryParameter("offset", schemas.boardListQuerySchema.shape.offset),
    ],
    responses: {
      "200": jsonResponse("Paginated boards", listResponseSchema(schemas.boardResponseSchema)),
      "400": errorJsonResponse("Invalid board query"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards",
    method: "post",
    tag: "Boards",
    summary: "Create board",
    operationId: "createBoard",
    requestSchema: schemas.createBoardSchema,
    responses: {
      "201": jsonResponse("Created board", successResponseSchema(schemas.boardResponseSchema)),
      "400": errorJsonResponse("Invalid board input"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards/{id}",
    method: "get",
    tag: "Boards",
    summary: "Get board",
    operationId: "getBoard",
    parameters: [uuidPathParameter("id", "Board ID")],
    responses: {
      "200": jsonResponse("Board details", successResponseSchema(schemas.boardResponseSchema)),
      "404": errorJsonResponse("Board not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards/{id}",
    method: "patch",
    tag: "Boards",
    summary: "Update board",
    operationId: "updateBoard",
    parameters: [uuidPathParameter("id", "Board ID")],
    requestSchema: schemas.updateBoardSchema,
    responses: {
      "200": jsonResponse("Updated board", successResponseSchema(schemas.boardResponseSchema)),
      "400": errorJsonResponse("Invalid board update input"),
      "404": errorJsonResponse("Board not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards/{id}",
    method: "delete",
    tag: "Boards",
    summary: "Delete board",
    operationId: "deleteBoard",
    parameters: [uuidPathParameter("id", "Board ID")],
    responses: {
      "204": noContentResponse("Board deleted"),
      "404": errorJsonResponse("Board not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards/{id}/links",
    method: "post",
    tag: "Board Links",
    summary: "Add link to board",
    operationId: "addBoardLink",
    parameters: [uuidPathParameter("id", "Board ID")],
    requestSchema: schemas.addBoardLinkSchema,
    responses: {
      "201": jsonResponse("Added board link", successResponseSchema(schemas.boardLinkResponseSchema)),
      "400": errorJsonResponse("Invalid board link input"),
      "404": errorJsonResponse("Board not found"),
      "409": errorJsonResponse("Link is already on this board"),
    },
  }),
  protectedOperation({
    path: "/api/v1/boards/{id}/links/{linkId}",
    method: "delete",
    tag: "Board Links",
    summary: "Remove link from board",
    operationId: "removeBoardLink",
    parameters: [
      uuidPathParameter("id", "Board ID"),
      uuidPathParameter("linkId", "Link ID"),
    ],
    responses: {
      "204": noContentResponse("Board link removed"),
      "404": errorJsonResponse("Board or board link not found"),
    },
  }),
  sessionOperation({
    path: "/api/v1/boards/{id}/links/reorder",
    method: "patch",
    tag: "Board Links",
    summary: "Reorder board links",
    operationId: "reorderBoardLinks",
    description: "Requires an authenticated dashboard session.",
    parameters: [uuidPathParameter("id", "Board ID")],
    requestSchema: schemas.reorderBoardLinksSchema,
    responses: {
      "200": jsonResponse("Reordered board links", successResponseSchema(z.array(schemas.boardLinkResponseSchema))),
      "400": errorJsonResponse("Invalid board link reorder input"),
      "404": errorJsonResponse("Board not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/analytics/links/{id}",
    method: "get",
    tag: "Analytics",
    summary: "Get link analytics",
    operationId: "getLinkAnalytics",
    parameters: [
      uuidPathParameter("id", "Link ID"),
      queryParameter("granularity", schemas.analyticsQuerySchema.shape.granularity),
    ],
    responses: {
      "200": jsonResponse("Link analytics", successResponseSchema(schemas.linkAnalyticsResponseSchema)),
      "400": errorJsonResponse("Invalid analytics query"),
      "404": errorJsonResponse("Link not found"),
    },
  }),
  protectedOperation({
    path: "/api/v1/analytics/boards/{id}",
    method: "get",
    tag: "Analytics",
    summary: "Get board analytics",
    operationId: "getBoardAnalytics",
    parameters: [
      uuidPathParameter("id", "Board ID"),
      queryParameter("granularity", schemas.analyticsQuerySchema.shape.granularity),
    ],
    responses: {
      "200": jsonResponse("Board analytics", successResponseSchema(schemas.boardAnalyticsResponseSchema)),
      "400": errorJsonResponse("Invalid analytics query"),
      "404": errorJsonResponse("Board not found"),
    },
  }),
  sessionOperation({
    path: "/api/v1/user/profile",
    method: "get",
    tag: "User/API Keys",
    summary: "Get current user profile",
    operationId: "getUserProfile",
    description: "Requires an authenticated dashboard session.",
    responses: {
      "200": jsonResponse("Current user profile", successResponseSchema(schemas.profileSchema)),
      "404": errorJsonResponse("User not found"),
    },
  }),
  sessionOperation({
    path: "/api/v1/user/profile",
    method: "patch",
    tag: "User/API Keys",
    summary: "Update current user profile",
    operationId: "updateUserProfile",
    description: "Requires an authenticated dashboard session.",
    requestSchema: schemas.updateProfileSchema,
    responses: {
      "200": jsonResponse("Updated user profile", successResponseSchema(schemas.profileSchema)),
      "400": errorJsonResponse("Invalid profile input"),
    },
  }),
  sessionOperation({
    path: "/api/v1/user/api-keys",
    method: "get",
    tag: "User/API Keys",
    summary: "List API keys",
    operationId: "listApiKeys",
    description: "Requires an authenticated dashboard session.",
    responses: {
      "200": jsonResponse("API keys", successResponseSchema(z.array(schemas.apiKeySchema))),
    },
  }),
  sessionOperation({
    path: "/api/v1/user/api-keys",
    method: "post",
    tag: "User/API Keys",
    summary: "Create API key",
    operationId: "createApiKey",
    description: "Requires an authenticated dashboard session. Newly created keys return the raw secret once.",
    requestSchema: schemas.createApiKeySchema,
    responses: {
      "201": jsonResponse("Created API key", successResponseSchema(schemas.createdApiKeySchema)),
      "400": errorJsonResponse("Invalid API key input"),
    },
  }),
  sessionOperation({
    path: "/api/v1/user/api-keys/{id}",
    method: "delete",
    tag: "User/API Keys",
    summary: "Delete API key",
    operationId: "deleteApiKey",
    description: "Requires an authenticated dashboard session.",
    parameters: [uuidPathParameter("id", "API key ID")],
    responses: {
      "204": noContentResponse("API key deleted"),
      "404": errorJsonResponse("API key not found"),
    },
  }),
  authOperation({
    path: "/api/v1/auth/register",
    method: "post",
    tag: "Auth",
    summary: "Register user",
    operationId: "registerUser",
    requestSchema: schemas.registerSchema,
    responses: {
      "201": jsonResponse("Registered user", successResponseSchema(schemas.authRegisterResponseSchema)),
      "409": errorJsonResponse("Email already registered"),
    },
  }),
  authOperation({
    path: "/api/v1/auth/login",
    method: "post",
    tag: "Auth",
    summary: "Validate login credentials",
    operationId: "loginUser",
    requestSchema: schemas.loginSchema,
    responses: {
      "200": jsonResponse("Login accepted", successResponseSchema(schemas.authLoginResponseSchema)),
      "401": errorJsonResponse("Invalid email or password"),
      "429": rateLimitedResponse(),
    },
  }),
  authOperation({
    path: "/api/v1/auth/forgot-password",
    method: "post",
    tag: "Auth",
    summary: "Request password reset",
    operationId: "forgotPassword",
    requestSchema: schemas.forgotPasswordSchema,
    responses: {
      "200": jsonResponse("Reset email accepted", successResponseSchema(schemas.messageResponseSchema)),
      "429": rateLimitedResponse(),
    },
  }),
  authOperation({
    path: "/api/v1/auth/reset-password",
    method: "post",
    tag: "Auth",
    summary: "Reset password",
    operationId: "resetPassword",
    requestSchema: schemas.resetPasswordSchema,
    responses: {
      "200": jsonResponse("Password reset", successResponseSchema(schemas.messageResponseSchema)),
    },
  }),
];

function buildPaths(definitions: EndpointDefinition[]) {
  return definitions.reduce<Record<string, PathItemObject>>((paths, definition) => {
    const current = paths[definition.path] ?? {};
    current[definition.method] = definition.operation;
    paths[definition.path] = current;
    return paths;
  }, {});
}

function buildComponentSchemas() {
  return Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [name, schemaFromZod(schema, name)]),
  );
}

export function generateOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: API_DESCRIPTION,
    },
    servers: [
      {
        url: "/",
        description: "Current deployment",
      },
    ],
    tags: [
      { name: "Links" },
      { name: "Boards" },
      { name: "Board Links" },
      { name: "Analytics" },
      { name: "User/API Keys" },
      { name: "Auth" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Pass a Linkboard API key as `Authorization: Bearer <key>`. Keys use the `lb_` prefix.",
        },
        sessionAuth: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
          description: "Dashboard session cookie used by profile and API key management endpoints.",
        },
      },
      schemas: buildComponentSchemas(),
    },
    paths: buildPaths(endpointDefinitions),
  };
}
