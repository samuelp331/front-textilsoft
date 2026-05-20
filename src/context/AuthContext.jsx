import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getApiBase, getToken } from '../lib/api.js';
import { canPerform as permCan, hasPageAccess as permHasPage } from '../lib/permissions.js';

const AuthContext = createContext(null);

const ADMIN_DEMO = Object.freeze({
  name: 'Administrador',
  identification: 'ADMIN-001',
  cellphone: '000-000-0000',
  jobTitle: 'Administrador del Sistema',
  email: 'admin@textilsoft.com',
  address: 'Oficina Principal',
  entryDate: '2023-01-01',
  role: 'admin',
});

function formatBackendError(body, fallbackMessage) {
  if (body === null || body === undefined) return fallbackMessage;
  if (typeof body === 'string') return body.trim() || fallbackMessage;
  if (typeof body !== 'object') return fallbackMessage;
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    const joined = body.detail.map((x) => String(x)).join('\n');
    return joined || fallbackMessage;
  }
  const parts = [];
  for (const [key, val] of Object.entries(body)) {
    if (key === 'detail' || val === undefined) continue;
    if (Array.isArray(val)) {
      parts.push(`${key}: ${val.join(', ')}`);
    } else if (typeof val === 'object' && val !== null) {
      parts.push(`${key}: ${JSON.stringify(val)}`);
    } else {
      parts.push(`${key}: ${val}`);
    }
  }
  return parts.length ? parts.join('\n') : fallbackMessage;
}

async function parseResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(formatBackendError(body, fallbackMessage));
  }
  return body;
}

function toProfileFromBackend(payload, username) {
  const backendUser = payload?.usuario || {};
  return {
    id: backendUser.id,
    name: backendUser.nombre || username || '',
    identification: String(backendUser.id || ''),
    cellphone: '',
    jobTitle: payload?.rol?.nombre || '',
    email: backendUser.email || username || '',
    address: '',
    entryDate: new Date().toISOString().split('T')[0],
    role: payload?.rol?.nombre || 'user',
  };
}

function toProfileFromProfile(payload) {
  return {
    id: payload?.usuario_id,
    name: payload?.nombre || '',
    identification: payload?.identificacion || String(payload?.usuario_id || ''),
    cellphone: payload?.celular || '',
    jobTitle: payload?.cargo || payload?.rol || '',
    email: payload?.email || '',
    address: payload?.direccion || '',
    entryDate: payload?.fecha_contratacion || new Date().toISOString().split('T')[0],
    role: payload?.rol || payload?.cargo || 'user',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lastLoginError, setLastLoginError] = useState(null);
  const [authReady, setAuthReady] = useState(() => !getToken());

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = getToken();
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const profile = await api.get('/profile/me');
        if (active) setUser(toProfileFromProfile(profile));
      } catch {
        localStorage.removeItem('authToken');
        if (active) setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setLastLoginError(null);
    try {
      const response = await fetch(`${getApiBase()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });
      const payload = await parseResponse(response, 'Error de autenticacion');
      const token = payload?.token;
      if (token) localStorage.setItem('authToken', token);
      setUser(toProfileFromBackend(payload, username));
      return true;
    } catch (e) {
      setLastLoginError(e.message || 'Error de autenticacion');
    }

    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      setUser({ ...ADMIN_DEMO });
      setLastLoginError(null);
      return true;
    }

    setUser(null);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('authToken');
  }, []);

  const recoverAccount = useCallback(async (email) => api.post('/recover-account', { email }), []);

  const resetPassword = useCallback(
    async (uid, token, pwd, passwordConfirm) =>
      api.post('/password-reset-confirm', {
        uid,
        token,
        password: pwd,
        password_confirm: passwordConfirm,
      }),
    [],
  );

  const hasPageAccess = useCallback((pageId) => permHasPage(user, pageId), [user]);

  const canPerformAction = useCallback((action) => permCan(user, action), [user]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      recoverAccount,
      resetPassword,
      hasPageAccess,
      canPerform: canPerformAction,
      lastLoginError,
      authReady,
    }),
    [user, login, logout, recoverAccount, resetPassword, hasPageAccess, canPerformAction, lastLoginError, authReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
