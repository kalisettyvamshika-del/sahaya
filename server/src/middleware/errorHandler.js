// Centralized error handler - last middleware
export function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err.message);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.publicMessage || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.publicMessage = message;
  }
}
