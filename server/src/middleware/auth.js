import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new ApiError('Invalid or expired session', 401);
  }
}

// Express middleware: requires Authorization: Bearer <token>
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError('Authentication required', 401));
  }
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (e) {
    next(e);
  }
}

// Optional auth - attaches user if token present but does not fail
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const decoded = verifyToken(token);
      req.user = { id: decoded.sub, email: decoded.email };
    } catch {
      // ignore
    }
  }
  next();
}
