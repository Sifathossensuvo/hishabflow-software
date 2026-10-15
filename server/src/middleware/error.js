import { AppError } from '../utils/errors.js';

const DUP_MESSAGES = {
  sku: 'This SKU is already used by another product.',
  email: 'This email is already registered.',
  invoiceNo: 'Invoice number clash. Please try again.',
};

export function notFound(req, res) {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, field: err.field, ...err.extra } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Invalid request data.', code: 'BAD_JSON' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request is too large.', code: 'TOO_LARGE' } });
  }
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: { message: first?.message || 'Invalid data.', code: 'VALIDATION', field: first?.path } });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: { message: `Invalid ${err.path}.`, code: 'VALIDATION', field: err.path } });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {}).find((k) => k !== 'business');
    return res.status(409).json({ error: { message: DUP_MESSAGES[field] || 'This record already exists.', code: 'DUPLICATE', field } });
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong on our side. Please try again.', code: 'SERVER_ERROR' } });
}
