export class AppError extends Error {
  constructor(status, message, code = 'ERROR', field, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.extra = extra;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
