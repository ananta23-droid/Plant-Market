import api from './axiosInstance.js';

export const getCart = async () => {
  return await api.get('/cart');
};

export const addToCart = async (productId, quantity = 1) => {
  return await api.post('/cart/items', { product_id: productId, quantity });
};

export const updateCartItem = async (itemId, quantity) => {
  return await api.put(`/cart/items/${itemId}`, { quantity });
};

export const removeFromCart = async (itemId) => {
  return await api.delete(`/cart/items/${itemId}`);
};

export const clearCart = async () => {
  return await api.delete('/cart');
};
