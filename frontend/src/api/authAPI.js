import api from './axiosInstance.js';

/**
 * Registers a new user.
 * @param {{ name, email, password, phone, role }} data
 */
export const registerAPI = (data) => api.post('/auth/register', data);

/**
 * Logs in a user.
 * @param {{ email, password }} data
 */
export const loginAPI = (data) => api.post('/auth/login', data);

/**
 * Logs out the current user (server-side is stateless; client must drop the token).
 */
export const logoutAPI = () => api.post('/auth/logout');

/**
 * Fetches the currently authenticated user's profile.
 */
export const getMeAPI = () => api.get('/auth/me');

/**
 * Fetches the detailed user profile from the users route.
 */
export const getProfileAPI = () => api.get('/users/profile');

/**
 * Updates the authenticated user's profile.
 * @param {{ name, phone, currentPassword, newPassword }} data
 */
export const updateProfileAPI = (data) => api.put('/users/profile', data);
