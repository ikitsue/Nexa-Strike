import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://nexa-strike.vercel.app/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://nexa-strike.vercel.app';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

// Helper function to get full URL for uploaded files
export const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath; // Already a full URL
  return `${BASE_URL}${filePath}`; // Relative path, add base URL
};

// Add token to requests
api.interceptors.request.use((config) => {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (email, password, username) =>
    api.post('/auth/register', { email, password, username }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

export const mapsAPI = {
  getAll: () => api.get('/maps'),
  getById: (id) => api.get(`/maps/${id}`),
};

export const clipsAPI = {
  getAll: () => api.get('/clips'),
  upload: (formData) => api.post('/clips', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const suggestionsAPI = {
  getAll: () => api.get('/suggestions'),
  create: (data) => api.post('/suggestions', data),
  update: (id, data) => api.patch(`/suggestions/${id}`, data),
  delete: (id) => api.delete(`/suggestions/${id}`),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  getById: (id) => api.get(`/users/${id}`),
  getAll: () => api.get('/users/admin/all'),
  ban: (id, banReason) => api.post(`/users/admin/${id}/ban`, { ban_reason: banReason }),
  unban: (id) => api.post(`/users/admin/${id}/unban`),
};

export default api;
