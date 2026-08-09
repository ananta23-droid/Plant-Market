import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getStats,
  getUsers,
  getVendors,
  verifyVendor,
  getAllProducts,
  deleteProductByAdmin,
  getAllOrders,
  getCategories,
  createCategory,
  deleteCategory,
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(protect, authorize('ADMIN'));

router.get('/stats',           getStats);
router.get('/users',           getUsers);
router.get('/vendors',         getVendors);
router.patch('/vendors/:id/verify', verifyVendor);
router.get('/products',        getAllProducts);
router.delete('/products/:id', deleteProductByAdmin);
router.get('/orders',          getAllOrders);
router.get('/categories',      getCategories);
router.post('/categories',     createCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
