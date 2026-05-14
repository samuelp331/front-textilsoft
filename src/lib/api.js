const BASE_URL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

export function getApiBase() {
  return BASE_URL.replace(/\/$/, '');
}

export function getToken() {
  return localStorage.getItem('authToken');
}

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let body = text;
  if (contentType.includes('application/json') && text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null
        ? body.detail || JSON.stringify(body)
        : body;
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  return body;
}

export const api = {
  request: apiRequest,
  get: (path) => apiRequest(path),
  post: (path, data) => apiRequest(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => apiRequest(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
