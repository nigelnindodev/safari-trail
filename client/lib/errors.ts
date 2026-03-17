export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized - Please login again') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}
