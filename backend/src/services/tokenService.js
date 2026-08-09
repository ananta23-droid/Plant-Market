import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generates a signed JWT for a given user payload.
 * @param {object} payload - Data to embed (id, role).
 * @returns {string} Signed JWT token.
 */
export const generateToken = (payload) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

/**
 * Verifies and decodes a JWT token.
 * @param {string} token - The JWT string to verify.
 * @returns {object} Decoded payload.
 * @throws {Error} If token is invalid or expired.
 */
export const verifyToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return jwt.verify(token, JWT_SECRET);
};
