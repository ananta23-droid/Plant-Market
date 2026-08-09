import prisma from '../config/db.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

/**
 * POST /api/v1/orders
 * Customer places an order from a list of product items.
 */
export const createOrder = async (req, res, next) => {
  try {
    const { items } = req.body;
    // items: [{ product_id, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    const productIds = items.map((i) => i.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more products not found.',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    // Validate stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}.`,
          error: { code: 'INSUFFICIENT_STOCK' },
        });
      }
    }

    // Build order items and compute total
    let total_amount = 0;
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const price = Number(product.price);
      total_amount += price * item.quantity;
      return { product_id: item.product_id, quantity: item.quantity, price };
    });

    // Create order and decrement stock atomically
    const order = await prisma.$transaction(async (tx) => {
      const orderData = {
        user_id: req.user.id,
        total_amount,
        order_items: { create: orderItemsData },
      };

      if (req.body.payment_method) {
        const isManualPay = !!req.body.transaction_id;
        orderData.payment = {
          create: {
            payment_method: req.body.payment_method,
            payment_status: isManualPay ? 'COMPLETED' : 'PENDING',
            transaction_id: req.body.transaction_id || `PENDING-${Date.now()}`
          }
        };
      }

      const newOrder = await tx.order.create({
        data: orderData,
        include: {
          order_items: {
            include: { product: { select: { name: true, price: true } } },
          },
          payment: true,
        },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    // Send order confirmation email asynchronously
    (async () => {
      try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user && user.email) {
          await sendOrderConfirmationEmail({
            toEmail: user.email,
            customerName: user.name,
            order,
          });
        }
      } catch (emailErr) {
        logger.error(`Failed to send order confirmation email: ${emailErr.message}`);
      }
    })();

    res.status(201).json({ success: true, message: 'Order placed successfully.', data: { order } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/mine
 * Customer views their own order history.
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { user_id: req.user.id },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                name: true,
                product_images: { select: { image_url: true }, take: 1 },
              },
            },
          },
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
 * GET /api/v1/orders/vendor
 * Vendor views orders that contain their products.
 */
export const getVendorOrders = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { user_id: req.user.id } });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found.',
        error: { code: 'VENDOR_NOT_FOUND' },
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        order_items: { some: { product: { vendor_id: vendor.id } } },
      },
      include: {
        user: { select: { name: true, email: true } },
        order_items: {
          where: { product: { vendor_id: vendor.id } },
          include: { product: { select: { name: true, price: true } } },
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
 * PUT /api/v1/orders/:id/status
 * Admin or vendor updates an order's status.
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        user: { select: { name: true, email: true } },
        payment: true,
      },
    });

    // Send order status update email asynchronously
    if (order.user?.email) {
      (async () => {
        try {
          await sendOrderStatusUpdateEmail({
            toEmail: order.user.email,
            customerName: order.user.name,
            order,
            newStatus: status,
          });
        } catch (emailErr) {
          logger.error(`Failed to send order status update email: ${emailErr.message}`);
        }
      })();
    }

    res.status(200).json({ success: true, message: 'Order status updated.', data: { order } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Order not found.', error: { code: 'NOT_FOUND' } });
    }
    next(error);
  }
};
