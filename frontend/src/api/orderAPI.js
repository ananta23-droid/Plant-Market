import api from './axiosInstance.js';

export const createOrder       = (items, extraPayload = {}) => api.post('/orders', { items, ...extraPayload });
export const getMyOrders       = ()           => api.get('/orders/mine');
export const getVendorOrders   = ()           => api.get('/orders/vendor');
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status`, { status });
