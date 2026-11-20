export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
export const bad = (m, x) => new ApiError(400, m, x);
export const unauthorized = (m = 'Please log in to continue.', x) => new ApiError(401, m, x);
export const forbidden = (m = 'You do not have permission to do this.', x) => new ApiError(403, m, x);
export const notFound = (m = 'Not found.') => new ApiError(404, m);
export const conflict = (m, x) => new ApiError(409, m, x);
export const badGateway = (m) => new ApiError(502, m);
