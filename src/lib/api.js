import axios from 'axios';

const PROD_BACKEND = 'https://supply-app-backend-production.up.railway.app';
const BASE_URL = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.PROD ? PROD_BACKEND : 'http://localhost:3001');
const TOKEN_KEY = 'dfa:roadmap:token';
const USER_KEY = 'dfa:roadmap:user';

const api = axios.create({ baseURL: BASE_URL });

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
};
export const saveSession = ({ token, user }) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && getToken()) {
      clearSession();
      window.dispatchEvent(new CustomEvent('roadmap:unauthorized'));
    }
    return Promise.reject(error);
  },
);

const BASE = '/api/internal-roadmap';

export const login = (email, password) =>
  api.post('/api/auth/login', { email, password }).then(r => r.data);

export const listMembers = () => api.get(`${BASE}/members`).then(r => r.data);
export const upsertMember = member => api.post(`${BASE}/members`, member).then(r => r.data);
export const deleteMember = id => api.delete(`${BASE}/members/${id}`).then(r => r.data);

export const listTasks = ({ onlyDeleted = false } = {}) =>
  api.get(`${BASE}/tasks`, { params: onlyDeleted ? { deleted: 1 } : {} }).then(r => r.data);
export const countDeletedTasks = () => api.get(`${BASE}/tasks/deleted-count`).then(r => r.data.count);
export const createTask = task => api.post(`${BASE}/tasks`, task).then(r => r.data);
export const updateTask = (id, task) => api.patch(`${BASE}/tasks/${id}`, task).then(r => r.data);
export const deleteTask = (id, { permanent = false } = {}) =>
  api.delete(`${BASE}/tasks/${id}`, { params: permanent ? { permanent: 1 } : {} }).then(r => r.data);
export const restoreTask = id => api.post(`${BASE}/tasks/${id}/restore`).then(r => r.data);
export const emptyTrash = () => api.delete(`${BASE}/tasks/trash/empty`).then(r => r.data);

export const listPlanBlocks = () => api.get(`${BASE}/plan`).then(r => r.data);
export const createPlanBlock = block => api.post(`${BASE}/plan`, block).then(r => r.data);
export const updatePlanBlock = (id, block) => api.patch(`${BASE}/plan/${id}`, block).then(r => r.data);
export const deletePlanBlock = id => api.delete(`${BASE}/plan/${id}`).then(r => r.data);

export const listComments = taskId => api.get(`${BASE}/tasks/${taskId}/comments`).then(r => r.data);
export const addComment = (taskId, body) => api.post(`${BASE}/tasks/${taskId}/comments`, { body }).then(r => r.data);
export const deleteComment = id => api.delete(`${BASE}/comments/${id}`).then(r => r.data);

export default api;
