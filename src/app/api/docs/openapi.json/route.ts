import { NextResponse } from "next/server";

import { generateOpenApiDocument } from "@/lib/openapi/generator";

export async function GET() {
  return NextResponse.json(generateOpenApiDocument());
}
