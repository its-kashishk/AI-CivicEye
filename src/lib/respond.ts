export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
