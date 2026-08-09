import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createOrder,
  getMyOrders,
  getVendorOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';

const router = Router();

// Customer/Any role: place an order
router.post('/', protect, authorize('CUSTOMER', 'VENDOR', 'ADMIN'), createOrder);

// Customer/Any role: own order history
router.get('/mine', protect, authorize('CUSTOMER', 'VENDOR', 'ADMIN'), getMyOrders);

// Vendor: orders containing their products
router.get('/vendor', protect, authorize('VENDOR'), getVendorOrders);

// Admin or Vendor: update order status
router.put('/:id/status', protect, authorize('ADMIN', 'VENDOR'), updateOrderStatus);

export default router;
