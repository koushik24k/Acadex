import axios from 'axios';

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

const api = axios.create({
  // Use explicit API URL in production deployments; fallback to Vite proxy during local dev.
  baseURL: configuredBaseUrl || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err);
  }
);

export default api;
