import axios from 'axios';

// Endpoint del backend DFA (mismo backend que la app principal).
// Configurable via VITE_BACKEND_URL en .env.local
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: BASE_URL });

// Auth simple para uso interno local: header X-Internal-Admin-Email.
// El backend verifica que el email esté en la allowlist (INTERNAL_ADMIN_EMAILS).
// IMPORTANTE: este header es spoof-able. Para uso interno en localhost solamente.
api.interceptors.request.use((config) => {
  const email = localStorage.getItem('dfa:roadmap:email');
  if (email) config.headers['X-Internal-Admin-Email'] = email;
  return config;
});

const BASE = '/api/internal-roadmap';

// Members
export const listMembers   = ()        => api.get(`${BASE}/members`).then(r => r.data);
export const upsertMember  = (m)       => api.post(`${BASE}/members`, m).then(r => r.data);
export const deleteMember  = (id)      => api.delete(`${BASE}/members/${id}`).then(r => r.data);

// Tasks
export const listTasks         = ({ onlyDeleted = false } = {}) =>
  api.get(`${BASE}/tasks`, { params: onlyDeleted ? { deleted: 1 } : {} }).then(r => r.data);
export const countDeletedTasks = () => api.get(`${BASE}/tasks/deleted-count`).then(r => r.data.count);
export const createTask        = (t)       => api.post(`${BASE}/tasks`, t).then(r => r.data);
export const updateTask        = (id, t)   => api.patch(`${BASE}/tasks/${id}`, t).then(r => r.data);
// Soft-delete por default; pasar { permanent: true } para borrado real
export const deleteTask        = (id, { permanent = false } = {}) =>
  api.delete(`${BASE}/tasks/${id}`, { params: permanent ? { permanent: 1 } : {} }).then(r => r.data);
export const restoreTask       = (id) => api.post(`${BASE}/tasks/${id}/restore`).then(r => r.data);
export const emptyTrash        = ()   => api.delete(`${BASE}/tasks/trash/empty`).then(r => r.data);

// Comments
export const listComments  = (taskId)  => api.get(`${BASE}/tasks/${taskId}/comments`).then(r => r.data);
export const addComment    = (taskId, body) => api.post(`${BASE}/tasks/${taskId}/comments`, { body }).then(r => r.data);
export const deleteComment = (id)      => api.delete(`${BASE}/comments/${id}`).then(r => r.data);

export default api;
