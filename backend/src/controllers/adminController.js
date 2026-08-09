import prisma from '../config/db.js';
import { sendProductDeletionEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

/**
 * GET /api/v1/admin/stats
 * Platform-wide statistics summary.
 */
export const getStats = async (req, res, next) => {
  try {
    const [userCount, vendorCount, productCount, orderCount, revenue, pendingVendors] =
      await Promise.all([
        prisma.user.count(),
        prisma.vendor.count(),
        prisma.product.count(),
        prisma.order.count(),
        prisma.order.aggregate({ _sum: { total_amount: true } }),
        prisma.vendor.count({ where: { verification_status: 'PENDING' } }),
      ]);

    res.status(200).json({
      success: true,
      message: 'Platform stats retrieved.',
      data: {
        users: userCount,
        vendors: vendorCount,
        products: productCount,
        orders: orderCount,
        revenue: Number(revenue._sum.total_amount || 0),
        pendingVendors,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/users
 * List all users with roles.
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/vendors
 * List all vendors with owner info and product counts.
 */
export const getVendors = async (req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: { vendors } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/vendors/:id/verify
 * Approve or reject a vendor.
 */
export const verifyVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['APPROVED', 'REJECTED', 'PENDING'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be APPROVED, REJECTED, or PENDING.',
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { verification_status: status },
      include: { user: { select: { name: true, email: true } } },
    });

    res.status(200).json({
      success: true,
      message: `Vendor ${status.toLowerCase()} successfully.`,
      data: { vendor },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Vendor not found.', error: { code: 'NOT_FOUND' } });
    }
    next(error);
  }
};

/**
 * GET /api/v1/admin/products
 * List all products across all vendors.
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        vendor: { select: { store_name: true } },
        category: { select: { name: true } },
        product_images: { select: { image_url: true }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: { products } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/orders
 * List all orders platform-wide.
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        order_items: {
          include: { product: { select: { name: true } } },
        },
        payment: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/categories
 * List all product categories.
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/categories
 * Create a new product category.
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be at least 2 characters.',
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), description: description?.trim() || null },
    });

    res.status(201).json({ success: true, message: 'Category created.', data: { category } });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A category with that name already exists.',
        error: { code: 'DUPLICATE_CATEGORY' },
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/categories/:id
 * Delete a category.
 */
export const deleteCategory = async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, message: 'Category deleted.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found.', error: { code: 'NOT_FOUND' } });
    }
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/products/:id
 * Delete a product by Admin with a specified deletion reason, notifying the vendor.
 */
export const deleteProductByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A deletion reason is required to remove a product.',
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        error: { code: 'NOT_FOUND' },
      });
    }

    // Delete product images and product
    await prisma.productImage.deleteMany({ where: { product_id: id } });
    await prisma.product.delete({ where: { id } });

    // Send email to vendor asynchronously
    const vendorEmail = product.vendor?.user?.email;
    const vendorName = product.vendor?.user?.name || product.vendor?.store_name;
    if (vendorEmail) {
      (async () => {
        try {
          await sendProductDeletionEmail({
            toEmail: vendorEmail,
            vendorName,
            productName: product.name,
            reason: reason.trim(),
            adminName: req.user.name,
            deletedAt: new Date().toISOString(),
          });
        } catch (emailErr) {
          logger.error(`Failed to send product deletion email: ${emailErr.message}`);
        }
      })();
    }

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" deleted and vendor notified.`,
    });
  } catch (error) {
    next(error);
  }
};

