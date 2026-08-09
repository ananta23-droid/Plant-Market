import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController.js';

const router = Router();

// All cart routes require user to be logged in
router.use(protect, authorize('CUSTOMER', 'VENDOR', 'ADMIN'));

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);

export default router;
