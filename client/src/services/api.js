import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vaultverse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !window.location.pathname.startsWith('/share/')) {
      // Don't auto-clear on public share password prompts
      if (error.response.data && error.response.data.code === 'PASSPHRASE_REQUIRED') {
        return Promise.reject(error);
      }
      localStorage.removeItem('vaultverse_token');
      localStorage.removeItem('vaultverse_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.post('/users/change-password', data),
};

export const documentsApi = {
  getDocuments: (params) => api.get('/documents', { params }),
  getDocument: (id) => api.get(`/documents/${id}`),
  upload: (formData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (id) =>
    api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    }),
  updateMetadata: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  scanPrivacy: (id) => api.post(`/documents/${id}/scan`),
};

export const sharingApi = {
  createShare: (data) => api.post('/share', data),
  getMyShares: () => api.get('/share/my-shares'),
  revokeShare: (id) => api.delete(`/share/${id}`),
  accessPublicShare: (token, passphrase) =>
    api.get(`/share/access/${token}`, { params: { passphrase } }),
  downloadPublicShare: (token, passphrase) =>
    api.get(`/share/access/${token}/download`, {
      params: { passphrase },
      responseType: 'blob',
    }),
};

export const emergencyApi = {
  getProfile: () => api.get('/emergency/profile'),
  updateProfile: (data) => api.put('/emergency/profile', data),
  requestAccess: (data) => api.post('/emergency/request-access', data),
  reviewRequest: (id, data) => api.post(`/emergency/requests/${id}/review`, data),
  getEmergencyData: (id, params) => api.get(`/emergency/access/${id}`, { params }),
  revokeAccess: (id) => api.delete(`/emergency/requests/${id}`),
  listRequests: () => api.get('/emergency/requests'),
};

export const trustedContactsApi = {
  list: () => api.get('/trusted-contacts'),
  add: (data) => api.post('/trusted-contacts', data),
  update: (id, data) => api.put(`/trusted-contacts/${id}`, data),
  remove: (id) => api.delete(`/trusted-contacts/${id}`),
};

export const privacyApi = {
  getOverview: () => api.get('/privacy/overview'),
  analyzeText: (data) => api.post('/privacy/analyze', data),
};

export const auditApi = {
  getLogs: (params) => api.get('/audit', { params }),
  verifyChain: () => api.get('/audit/verify'),
};

export default api;

