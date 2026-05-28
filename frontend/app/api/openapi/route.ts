import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import { withCors, handleOptions } from "@/lib/api/cors";

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export function GET(request: NextRequest) {
  const yamlPath = join(process.cwd(), "..", "docs", "openapi.yaml");
  const spec = parse(readFileSync(yamlPath, "utf8"));
  return withCors(
    request,
    NextResponse.json(spec, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  );
}
