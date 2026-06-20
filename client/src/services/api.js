import axios from 'axios';

// Use dynamic API URL based on environment (Vite proxy for local, Render URL for production)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});


// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Convenience service methods
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  register: (data) => api.post('/auth/register', data),
  updateUser: (id, data) => api.patch(`/auth/users/${id}`, data),
};

export const villageService = {
  getAll: () => api.get('/villages'),
  getById: (id) => api.get(`/villages/${id}`),
  create: (data) => api.post('/villages', data),
  update: (id, data) => api.put(`/villages/${id}`, data),
  delete: (id) => api.delete(`/villages/${id}`),
};

export const sourceService = {
  getAll: (params) => api.get('/sources', { params }),
  getById: (id) => api.get(`/sources/${id}`),
  getStats: (id, range) => api.get(`/sources/${id}/stats`, { params: { range } }),
  create: (data) => api.post('/sources', data),
  update: (id, data) => api.put(`/sources/${id}`, data),
  delete: (id) => api.delete(`/sources/${id}`),
};

export const sensorService = {
  getLatest: (sourceId) => api.get(`/sensors/${sourceId}/latest`),
  getHistory: (sourceId, params) => api.get(`/sensors/${sourceId}/history`, { params }),
};

export const alertService = {
  getAll: (params) => api.get('/alerts', { params }),
  getStats: () => api.get('/alerts/stats'),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
};

export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getVillageHealth: () => api.get('/analytics/village-health'),
};

export const readingsService = {
  getAll: (params) => api.get('/readings', { params }),
  getLatestPerSource: () => api.get('/readings/latest'),
  create: (data) => api.post('/readings', data),         // public ESP32 alias
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};
