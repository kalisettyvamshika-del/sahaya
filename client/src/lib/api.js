import axios from 'axios';

// PUBLIC base URL (no secrets). The backend uses server-side env vars
// for Supabase/Gemini — nothing secret is reachable from the browser.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 20000,
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sahaya_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // Only clear if it's not /me (which checks auth state)
      const url = err.config?.url || '';
      if (!url.includes('/auth/me')) {
        localStorage.removeItem('sahaya_token');
        localStorage.removeItem('sahaya_user');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
