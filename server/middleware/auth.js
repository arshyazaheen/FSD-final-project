import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware: Validates JWT Bearer token and attaches user to req
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.',
        code: 'UNAUTHENTICATED',
      });
    }

    const secret = process.env.JWT_SECRET || 'vaultverse_production_jwt_secret_key_minimum_32_characters_long_2026!';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token.',
        code: 'INVALID_TOKEN',
      });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or deactivated.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status.toLowerCase()}. Access denied.`,
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    if (user.isAccountLocked()) {
      return res.status(403).json({
        success: false,
        error: 'Account is temporarily locked due to excessive failed attempts.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
        code: 'UNAUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

