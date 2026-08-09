import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  initiateEsewaPayment,
  verifyEsewaPayment,
} from '../controllers/paymentController.js';

const router = Router();

// ── Khalti ───────────────────────────────────────────────────────────────────
// Initiate a Khalti payment — redirects user to Khalti test/live portal
router.post('/khalti/initiate', protect, initiateKhaltiPayment);
// Verify callback after user returns from Khalti portal
router.post('/khalti/verify',   protect, verifyKhaltiPayment);

// ── eSewa ────────────────────────────────────────────────────────────────────
// Get signed form parameters for eSewa v2 form-POST (redirects to eSewa portal)
router.post('/esewa/initiate',  protect, initiateEsewaPayment);
// Verify the base64-encoded callback from eSewa success_url
router.post('/esewa/verify',    protect, verifyEsewaPayment);

export default router;
