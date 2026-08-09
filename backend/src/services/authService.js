import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import { generateToken } from './tokenService.js';

const SALT_ROUNDS = 10;

/**
 * Registers a new user in the database.
 * Throws a structured error if email already exists.
 * @param {object} data - { name, email, password, phone, role }
 * @returns {{ user: object, token: string }}
 */
export const registerUser = async ({ name, email, password, phone, role }) => {
  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('An account with that email already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_CONFLICT';
    throw err;
  }

  // Hash the password before storage (never store plaintext)
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Determine allowed role (only CUSTOMER and VENDOR allowed via public registration)
  const allowedRoles = ['CUSTOMER', 'VENDOR'];
  const assignedRole = allowedRoles.includes(role?.toUpperCase()) ? role.toUpperCase() : 'CUSTOMER';

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: assignedRole,
    },
  });

  // If registering as VENDOR, create a pending vendor profile
  if (assignedRole === 'VENDOR') {
    await prisma.vendor.create({
      data: {
        user_id: user.id,
        store_name: `${name}'s Nursery`,
        verification_status: 'PENDING',
      },
    });
  }

  // Automatically create a cart for new customer registrations
  if (assignedRole === 'CUSTOMER') {
    await prisma.cart.create({ data: { user_id: user.id } });
  }

  const token = generateToken({ id: user.id, role: user.role });

  // Re-fetch with vendor relation so the response mirrors what loginUser returns
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      vendor: {
        select: {
          id: true,
          store_name: true,
          description: true,
          verification_status: true,
        },
      },
    },
  });

  const { password: _pw, ...safeUser } = fullUser;
  return { user: safeUser, token };
};

/**
 * Authenticates a user by email and password.
 * Throws structured errors for invalid credentials.
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, token: string }}
 */
export const loginUser = async (email, password) => {
  // Fetch user WITH vendor relation so frontend gets verification_status immediately on login
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      vendor: {
        select: {
          id: true,
          store_name: true,
          description: true,
          verification_status: true,
        },
      },
    },
  });

  // Use a generic error message to prevent email enumeration attacks
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = generateToken({ id: user.id, role: user.role });

  // Strip password from response; keep vendor relation intact
  const { password: _pw, ...safeUser } = user;
  return { user: safeUser, token };
};

/**
 * Retrieves a user's public profile by their ID.
 * @param {string} userId
 * @returns {object} Safe user object (no password)
 */
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      created_at: true,
      vendor: {
        select: {
          id: true,
          store_name: true,
          description: true,
          verification_status: true,
        },
      },
    },
  });

  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  return user;
};
