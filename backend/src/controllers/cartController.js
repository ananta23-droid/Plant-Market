import prisma from '../config/db.js';

/**
 * Helper function to get or create a cart for the user
 */
const getOrCreateCart = async (userId) => {
  let cart = await prisma.cart.findUnique({
    where: { user_id: userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              vendor: { select: { store_name: true } },
              product_images: { select: { image_url: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { user_id: userId },
      include: { items: { include: { product: true } } },
    });
  }

  return cart;
};

/**
 * GET /api/v1/cart
 * Get the current user's cart
 */
export const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, data: { cart } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart/items
 * Add an item to the cart or update quantity if it exists
 */
export const addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = await prisma.product.findUnique({ where: { id: product_id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} available.`,
      });
    }

    const cart = await getOrCreateCart(req.user.id);

    const existingItem = cart.items.find(item => item.product_id === product_id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for the updated quantity. Only ${product.stock} available.`,
        });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cart_id: cart.id,
          product_id,
          quantity,
        },
      });
    }

    const updatedCart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, message: 'Item added to cart.', data: { cart: updatedCart } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/cart/items/:itemId
 * Update quantity of a cart item
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    if (item.product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${item.product.stock} available.`,
      });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    const updatedCart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, message: 'Cart updated.', data: { cart: updatedCart } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart/items/:itemId
 * Remove an item from the cart
 */
export const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    const updatedCart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, message: 'Item removed from cart.', data: { cart: updatedCart } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart
 * Clear the entire cart
 */
export const clearCart = async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { user_id: req.user.id } });
    
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
    }

    res.status(200).json({ success: true, message: 'Cart cleared successfully.', data: { cart: { items: [] } } });
  } catch (error) {
    next(error);
  }
};
