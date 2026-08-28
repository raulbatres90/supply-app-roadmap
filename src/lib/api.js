import axios from 'axios';

const PROD_BACKEND = 'https://supply-app-backend-production.up.railway.app';
const BASE_URL = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.PROD ? PROD_BACKEND : 'http://localhost:3001');

const api = axios.create({ baseURL: BASE_URL });

const BASE = '/api/internal-roadmap';

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

// ── Métricas internas ───────────────────────────────────────────────────────
// Cuelgan de otra ruta con su propio secreto: cruzan datos de TODOS los
// clientes, y /api/internal-roadmap es de acceso público por enlace.
// El token NO viaja en el bundle — lo escribe el equipo una vez y queda en este
// navegador. Así no se publica al compartir la URL del roadmap.
const METRICS_TOKEN_KEY = 'dfa_metrics_token';
export const getMetricsToken = () => localStorage.getItem(METRICS_TOKEN_KEY) || '';
export const setMetricsToken = t => localStorage.setItem(METRICS_TOKEN_KEY, t);
export const clearMetricsToken = () => localStorage.removeItem(METRICS_TOKEN_KEY);

// Solo se manda la cabecera si hay token. Mandarla vacía obliga al navegador a
// hacer un preflight innecesario, y cualquier proxy o CORS que no la declare
// hace fallar la petición antes de salir.
const metricsHeaders = () => {
  const t = getMetricsToken();
  return t ? { 'x-internal-metrics-token': t } : {};
};

export const fetchMetrics = (days = 30) =>
  api.get('/api/internal-metrics', { params: { days }, headers: metricsHeaders() }).then(r => r.data);
export const captureSnapshot = () =>
  api.post('/api/internal-metrics/snapshot', {}, { headers: metricsHeaders() }).then(r => r.data);

export const listComments = taskId => api.get(`${BASE}/tasks/${taskId}/comments`).then(r => r.data);
export const addComment = (taskId, body) => api.post(`${BASE}/tasks/${taskId}/comments`, { body }).then(r => r.data);
export const deleteComment = id => api.delete(`${BASE}/comments/${id}`).then(r => r.data);

export default api;
