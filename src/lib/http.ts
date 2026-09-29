// HTTP helpers: standard error envelope from docs/07 and a route wrapper.
//   { "error": { "code": "...", "message": "...", "retryable": false } }
import { z, ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new ApiError(400, "VALIDATION_ERROR", message, false, details),
  unauthenticated: (message = "Authentication required") =>
    new ApiError(401, "UNAUTHENTICATED", message),
  forbidden: (message = "You do not have permission to perform this action") =>
    new ApiError(403, "FORBIDDEN", message),
  notFound: (message = "Resource not found") => new ApiError(404, "NOT_FOUND", message),
  conflict: (message: string) => new ApiError(409, "CONFLICT", message),
  invalidTransition: (message: string) => new ApiError(400, "INVALID_TRANSITION", message),
  tooLarge: (message: string) => new ApiError(413, "PAYLOAD_TOO_LARGE", message),
  unprocessable: (message: string) => new ApiError(422, "UNPROCESSABLE", message),
  mlUnavailable: (message = "AI analysis is temporarily unavailable") =>
    new ApiError(503, "ML_UNAVAILABLE", message, true),
};

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: err.code,
          message: err.message,
          retryable: err.retryable,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return errorResponse(Errors.validation("Invalid request", formatZod(err)));
  }
  console.error("[api] unhandled error", err);
  return Response.json(
    { error: { code: "INTERNAL", message: "Internal server error", retryable: false } },
    { status: 500 },
  );
}

export function formatZod(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/** Wraps a route handler so thrown ApiError/ZodError become the standard envelope. */
export function route<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function parseJson<T extends ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw Errors.validation("Request body must be valid JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw Errors.validation("Invalid request body", formatZod(parsed.error));
  return parsed.data;
}

export function parseQuery<T extends ZodType>(req: Request, schema: T): z.infer<T> {
  const raw = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw Errors.validation("Invalid query parameters", formatZod(parsed.error));
  return parsed.data;
}

export const idParam = z.uuid();

export async function paramId(ctx: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await ctx.params;
  const parsed = idParam.safeParse(id);
  if (!parsed.success) throw Errors.validation("Path parameter 'id' must be a UUID");
  return parsed.data;
}
