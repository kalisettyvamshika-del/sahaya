import axios from 'axios';
import mockApi from './mockApi.js';

// PUBLIC base URL (no secrets). The backend uses server-side env vars
// for Supabase/Gemini — nothing secret is reachable from the browser.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const realApi = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 20000,
});

// Attach JWT if present
realApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sahaya_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
realApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err.config?.url || '';
      if (!url.includes('/auth/me')) {
        // Don't clear demo session on 401 - keep user logged in for demo
        if (localStorage.getItem('sahaya_demo_mode') !== 'true') {
          localStorage.removeItem('sahaya_token');
          localStorage.removeItem('sahaya_user');
        }
      }
    }
    return Promise.reject(err);
  }
);

function isDemoMode() {
  return localStorage.getItem('sahaya_demo_mode') === 'true';
}

// In demo mode, intercept all calls and route to the localStorage-backed mock
const api = {
  get: (url, config) => (isDemoMode() ? mockApi.get(url, config) : realApi.get(url, config)),
  post: (url, body, config) => (isDemoMode() ? mockApi.post(url, body, config) : realApi.post(url, body, config)),
  put: (url, body, config) => (isDemoMode() ? mockApi.put(url, body, config) : realApi.put(url, body, config)),
  patch: (url, body, config) => (isDemoMode() ? mockApi.patch(url, body, config) : realApi.patch(url, body, config)),
  delete: (url, config) => (isDemoMode() ? mockApi.delete(url, config) : realApi.delete(url, config)),
};

export default api;
