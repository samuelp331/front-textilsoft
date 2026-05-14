import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, getApiBase } from '../lib/api.js';
import { canPerform as permCan, hasPageAccess as permHasPage } from '../lib/permissions.js';
import { notify } from '../lib/notify.js';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [lastLoginError, setLastLoginError] = useState(null);

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

  const register = useCallback(async (userData) => {
    if (
      !userData?.name ||
      !userData?.identification ||
      !userData?.cellphone ||
      !userData?.email ||
      !userData?.rol ||
      !userData?.address ||
      !userData?.password ||
      !userData?.confirmPassword
    ) {
      notify.toast('Por favor complete todos los campos requeridos.', 'warning');
      return false;
    }
    if (userData.password !== userData.confirmPassword) {
      notify.toast('Las contrasenas no coinciden.', 'warning');
      return false;
    }
    try {
      await api.post('/register', {
        nombre: userData.name,
        identificacion: userData.identification,
        celular: userData.cellphone,
        direccion: userData.address,
        email: userData.email,
        password: userData.password,
        rol: userData.rol || 'operario',
      });
      return true;
    } catch (error) {
      notify.toast(`Hubo un error al registrar: ${error.message}`, 'error');
      return false;
    }
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
      register,
      recoverAccount,
      resetPassword,
      hasPageAccess,
      canPerform: canPerformAction,
      lastLoginError,
    }),
    [user, login, logout, register, recoverAccount, resetPassword, hasPageAccess, canPerformAction, lastLoginError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
