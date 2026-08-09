/**
 * Validates the body of a registration request.
 * Returns a structured error message on failure, null on success.
 * @param {object} body
 * @returns {string|null}
 */
export const validateRegisterInput = (body) => {
  const { name, email, password } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Name is required and must be at least 2 characters long.';
  }

  if (!email || typeof email !== 'string') {
    return 'A valid email address is required.';
  }

  // Simple but effective RFC-5322-like email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please provide a valid email address.';
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  // Enforce at least one uppercase, one lowercase, one number
  const strongPwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  if (!strongPwRegex.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
  }

  if (!body.phone || typeof body.phone !== 'string' || body.phone.trim().length < 7) {
    return 'A valid phone number is required.';
  }

  return null;
};

/**
 * Validates the body of a login request.
 * @param {object} body
 * @returns {string|null}
 */
export const validateLoginInput = (body) => {
  const { email, password } = body;

  if (!email || typeof email !== 'string') {
    return 'Email is required.';
  }

  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }

  return null;
};
