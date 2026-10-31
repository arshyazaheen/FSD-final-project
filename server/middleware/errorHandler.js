/**
 * Centralized Global Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'SERVER_ERROR';

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Handle Mongoose Invalid ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid resource identifier format for ${err.path}`;
  }

  // Handle Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    code = 'FILE_TOO_LARGE';
    message = 'File size exceeds maximum permitted limit (50MB)';
  }

  // Log error in development, omitting stack traces in production
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message} - URL: ${req.originalUrl}`);
    if (statusCode === 500) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

