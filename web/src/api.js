const API_BASE = '/api';

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
  getMe: () => request('/auth/me'),

  // Sessions
  startSession: (data) => request('/sessions/start', { method: 'POST', body: JSON.stringify(data) }),
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
