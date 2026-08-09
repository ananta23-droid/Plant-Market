import prisma from '../config/db.js';
import bcrypt from 'bcrypt';

/**
 * GET /api/v1/users/profile
 * Returns the logged-in user's detailed profile.
 * Requires `protect` middleware.
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        addresses: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/users/profile
 * Updates the logged-in user's name, phone, and/or password.
 * Requires `protect` middleware.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;

    const updateData = {};

    if (name && name.trim().length >= 2) {
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length < 7) {
        return res.status(400).json({
          success: false,
          message: 'A valid phone number is required.',
          error: { code: 'VALIDATION_ERROR', details: 'Invalid phone number' },
        });
      }
      updateData.phone = phone.trim();
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
          error: { code: 'VALIDATION_ERROR', details: 'currentPassword missing' },
        });
      }

      // Fetch user with password for comparison
      const userWithPw = await prisma.user.findUnique({ where: { id: req.user.id } });
      const match = await bcrypt.compare(currentPassword, userWithPw.password);

      if (!match) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
          error: { code: 'INVALID_CREDENTIALS', details: 'Password mismatch' },
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long.',
          error: { code: 'VALIDATION_ERROR', details: 'Password too short' },
        });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};
