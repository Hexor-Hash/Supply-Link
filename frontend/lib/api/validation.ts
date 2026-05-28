import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodType } from 'zod';
import {
  apiError,
  ApiErrorDetail,
  ApiErrorEnvelope,
  ErrorCode,
} from '@/lib/api/errors';
import { getCorrelationId } from '@/lib/api/correlation';

export const ValidationTaxonomy = {
  INVALID_JSON: 'invalid_json',
  UNSUPPORTED_CONTENT_TYPE: 'unsupported_content_type',
  BODY_SCHEMA_FAILED: 'body_schema_failed',
  QUERY_SCHEMA_FAILED: 'query_schema_failed',
  PARAMS_SCHEMA_FAILED: 'params_schema_failed',
  MULTIPART_PARSE_FAILED: 'multipart_parse_failed',
} as const;

export type ValidationTaxonomy =
  (typeof ValidationTaxonomy)[keyof typeof ValidationTaxonomy];

type ErrorLocation = ApiErrorDetail['location'];

export class RequestValidationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly taxonomy: ValidationTaxonomy,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

function logValidationFailure(
  request: NextRequest,
  error: RequestValidationError,
): void {
  console.warn('[api-validation]', {
    route: request.nextUrl.pathname,
    method: request.method,
    correlationId: getCorrelationId(request),
    taxonomy: error.taxonomy,
    code: error.code,
    status: error.status,
    detailCount: error.details?.length ?? 0,
  });
}

function toFieldPath(path: Array<string | number>): string {
  if (path.length === 0) return '$';
  return path.join('.');
}

function mapZodIssues(error: ZodError, location: ErrorLocation): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    field: toFieldPath(issue.path.filter((part): part is string | number => typeof part !== 'symbol')),
    location,
    message: issue.message,
    code: issue.code,
  }));
}

function ensureContentType(
  request: NextRequest,
  expected: 'application/json' | 'multipart/form-data',
): void {
  const header = request.headers.get('content-type');
  const normalized = header?.split(';')[0].trim().toLowerCase();

  if (normalized === expected) return;

  throw new RequestValidationError(
    415,
    ErrorCode.UNSUPPORTED_CONTENT_TYPE,
    `Expected ${expected} request body`,
    ValidationTaxonomy.UNSUPPORTED_CONTENT_TYPE,
  );
}

function parseWithSchema<T>(
  value: unknown,
  schema: ZodType<T>,
  location: ErrorLocation,
  taxonomy:
    | typeof ValidationTaxonomy.BODY_SCHEMA_FAILED
    | typeof ValidationTaxonomy.QUERY_SCHEMA_FAILED
    | typeof ValidationTaxonomy.PARAMS_SCHEMA_FAILED,
): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  throw new RequestValidationError(
    400,
    ErrorCode.VALIDATION_ERROR,
    'Request validation failed',
    taxonomy,
    mapZodIssues(result.error, location),
  );
}

export function handleValidationError(
  request: NextRequest,
  error: unknown,
): NextResponse<ApiErrorEnvelope> | null {
  if (!(error instanceof RequestValidationError)) return null;
  logValidationFailure(request, error);
  return apiError(request, error.status, error.code, error.message, {
    details: error.details,
  });
}

export function parseJsonBody<T>(
  request: NextRequest,
  rawBody: string,
  schema: ZodType<T>,
): T {
  ensureContentType(request, 'application/json');

  let parsed: unknown;
  try {
    parsed = rawBody.length === 0 ? null : JSON.parse(rawBody);
  } catch {
    throw new RequestValidationError(
      400,
      ErrorCode.INVALID_JSON,
      'Request body must be valid JSON',
      ValidationTaxonomy.INVALID_JSON,
    );
  }

  return parseWithSchema(parsed, schema, 'body', ValidationTaxonomy.BODY_SCHEMA_FAILED);
}

export function parseQuery<T>(request: NextRequest, schema: ZodType<T>): T {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  return parseWithSchema(query, schema, 'query', ValidationTaxonomy.QUERY_SCHEMA_FAILED);
}

export async function parsePathParams<T>(
  params: Promise<unknown>,
  schema: ZodType<T>,
): Promise<T> {
  return parseWithSchema(await params, schema, 'params', ValidationTaxonomy.PARAMS_SCHEMA_FAILED);
}

export async function parseMultipartForm<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<{ formData: FormData; fields: T }> {
  ensureContentType(request, 'multipart/form-data');

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new RequestValidationError(
      400,
      ErrorCode.INVALID_PAYLOAD,
      'Malformed multipart body',
      ValidationTaxonomy.MULTIPART_PARSE_FAILED,
    );
  }

  const rawFields = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, value]),
  );

  return {
    formData,
    fields: parseWithSchema(rawFields, schema, 'body', ValidationTaxonomy.BODY_SCHEMA_FAILED),
  };
}
