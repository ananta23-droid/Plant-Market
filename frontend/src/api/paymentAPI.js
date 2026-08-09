import api from './axiosInstance.js';

// ── Khalti ──────────────────────────────────────────────────────────────────
export const initiateKhaltiPayment = (order_id) => api.post('/payment/khalti/initiate', { order_id });
export const verifyKhaltiPayment   = (data)     => api.post('/payment/khalti/verify', data);

// ── eSewa ───────────────────────────────────────────────────────────────────
export const initiateEsewaPayment = (order_id) => api.post('/payment/esewa/initiate', { order_id });
export const verifyEsewaPayment   = (data)     => api.post('/payment/esewa/verify', data);
