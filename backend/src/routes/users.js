import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// All user profile routes require authentication
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
