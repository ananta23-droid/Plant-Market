import { verifyToken } from '../services/tokenService.js';
import prisma from '../config/db.js';

/**
 * protect middleware — Verifies a Bearer JWT in the Authorization header.
 * Attaches the decoded user object to `req.user` for downstream handlers.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      const err = new Error('Not authorized. No token provided.');
      err.statusCode = 401;
      err.code = 'NO_TOKEN';
      return next(err);
    }

    // Verify and decode the token
    const decoded = verifyToken(token);

    // Fetch user from DB to ensure the account still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      const err = new Error('Not authorized. User no longer exists.');
      err.statusCode = 401;
      err.code = 'USER_NOT_FOUND';
      return next(err);
    }

    req.user = user;
    next();
  } catch (error) {
    // Handle JWT-specific errors
    if (error.name === 'TokenExpiredError') {
      error.message = 'Your session has expired. Please log in again.';
      error.statusCode = 401;
      error.code = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      error.message = 'Invalid token. Please log in again.';
      error.statusCode = 401;
      error.code = 'INVALID_TOKEN';
    }
    next(error);
  }
};

/**
 * authorize(...roles) — Role-based access control guard.
 * Must be used AFTER `protect`.
 * @param {...string} roles - Allowed roles e.g. 'ADMIN', 'VENDOR'.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error(
        `Access denied. This resource requires one of the following roles: ${roles.join(', ')}.`
      );
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }
    next();
  };
};
