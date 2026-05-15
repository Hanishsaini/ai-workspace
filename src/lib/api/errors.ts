/** Typed API errors mapped to HTTP status codes by the route wrapper. */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const Errors = {
  unauthorized: () => new ApiError(401, "Unauthorized", "UNAUTHORIZED"),
  forbidden: () => new ApiError(403, "Forbidden", "FORBIDDEN"),
  notFound: (what = "Resource") =>
    new ApiError(404, `${what} not found`, "NOT_FOUND"),
  badRequest: (message = "Bad request") =>
    new ApiError(400, message, "BAD_REQUEST"),
  conflict: (message = "Conflict") => new ApiError(409, message, "CONFLICT"),
  rateLimited: () =>
    new ApiError(429, "Too many requests", "RATE_LIMITED"),
  internal: () =>
    new ApiError(500, "Internal server error", "INTERNAL"),
};
