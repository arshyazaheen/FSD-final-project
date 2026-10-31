import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication routes (prevent brute force / credential stuffing)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: () => process.env.NODE_ENV === 'test', // bypass in automated tests
});

/**
 * Standard API rate limiter for general routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Public document / share link access limiter
 */
export const shareAccessLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many access attempts on this shared resource.',
    code: 'SHARE_RATE_LIMIT_EXCEEDED',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

