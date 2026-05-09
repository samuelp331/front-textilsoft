(function () {
    const BASE_URL = window.TEXTILSOFT_API_BASE_URL || 'http://127.0.0.1:8000/api';

    function getToken() {
        return localStorage.getItem('authToken');
    }

    async function request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        const token = getToken();
        if (token) {
            headers.Authorization = `Token ${token}`;
        }

        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        let body = text;
        if (contentType.includes('application/json') && text) {
            try {
                body = JSON.parse(text);
            } catch (_) {
                body = text;
            }
        }

        if (!response.ok) {
            const detail = typeof body === 'object' && body !== null
                ? body.detail || JSON.stringify(body)
                : body;
            throw new Error(detail || `Error HTTP ${response.status}`);
        }

        return body;
    }

    window.apiClient = {
        request,
        get: (path) => request(path),
        post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
        put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
        patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (path) => request(path, { method: 'DELETE' }),
    };
})();
