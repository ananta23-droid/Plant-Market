import { registerUser, loginUser, getUserProfile } from '../services/authService.js';
import { validateRegisterInput, validateLoginInput } from '../validators/authValidator.js';

/**
 * POST /api/v1/auth/register
 * Registers a new user account (CUSTOMER or VENDOR).
 */
export const register = async (req, res, next) => {
  try {
    const validationError = validateRegisterInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        error: { code: 'VALIDATION_ERROR', details: validationError },
      });
    }

    const { name, email, password, phone, role } = req.body;
    const { user, token } = await registerUser({ name, email, password, phone, role });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Authenticates an existing user and returns a JWT.
 */
export const login = async (req, res, next) => {
  try {
    const validationError = validateLoginInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        error: { code: 'VALIDATION_ERROR', details: validationError },
      });
    }

    const { email, password } = req.body;
    const { user, token } = await loginUser(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 * Client-side logout: instructs the client to discard their token.
 * (JWT is stateless; the client is responsible for deleting the token.)
 */
export const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please discard your token.',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user's profile.
 * Requires `protect` middleware.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Profile fetched successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
