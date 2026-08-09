/**
 * Resolves an image URL — handles:
 * - Full absolute URLs (Cloudinary, external): returned as-is
 * - Relative /uploads/... paths (local dev storage): prepended with backend base URL
 * - null/undefined: returns null (caller can show fallback emoji)
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path from local storage
  return `${BACKEND_URL}${url}`;
};
