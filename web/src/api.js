// API base:
// - In Vite dev, ALWAYS use relative `/api` so the dev server proxy works.
// - In builds (Docker/production), prefer `VITE_API_URL` if provided.
let API_BASE = '/api';
if (typeof import.meta !== 'undefined' && import.meta.env) {
  if (!import.meta.env.DEV && import.meta.env.VITE_API_URL) {
    API_BASE = import.meta.env.VITE_API_URL;
  }
}

function getHeaders() {
  const token = localStorage.getItem('wat_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('wat_token');
    localStorage.removeItem('wat_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  demo: () => request('/auth/demo', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Sessions
  // `extraOptions` lets callers pass things like AbortController signal.
  startSession: (data, extraOptions = {}) =>
    request('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(data),
      ...extraOptions,
    }),
  submitSession: (sessionId, data) => request(`/sessions/${sessionId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  getSessionResults: (sessionId) => request(`/sessions/${sessionId}/results`),
  listSessions: (module) => request(`/sessions${module ? `?module=${module}` : ''}`),

  // Analysis
  getHighlights: (responseId) => request(`/responses/${responseId}/highlights`),
  getTimeline: () => request('/timeline'),
  getPassport: () => request('/passport'),
  suggestRewrites: (data) => request('/rewrite', { method: 'POST', body: JSON.stringify(data) }),

  // Misc
  getPrompts: (module) => request(`/prompts/${module}`),
  health: () => request('/health'),
};
