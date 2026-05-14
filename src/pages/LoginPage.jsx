import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notify } from '../lib/notify.js';

const USERNAME_HISTORY_KEY = 'textilsoft_login_username_history';
const LEGACY_LAST_USERNAME_KEY = 'textilsoft_last_login_username';
const MAX_USERNAME_HISTORY = 15;

function readUsernameHistory() {
  try {
    const raw = localStorage.getItem(USERNAME_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function writeUsernameHistory(entries) {
  const out = [];
  const seen = new Set();
  for (const raw of entries) {
    const u = String(raw).trim();
    if (!u) continue;
    const k = u.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
    if (out.length >= MAX_USERNAME_HISTORY) break;
  }
  try {
    localStorage.setItem(USERNAME_HISTORY_KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
}

function rememberUsername(username) {
  const u = String(username).trim();
  if (!u) return;
  const rest = readUsernameHistory().filter((x) => x.toLowerCase() !== u.toLowerCase());
  writeUsernameHistory([u, ...rest]);
}

function migrateLegacyLastUsername() {
  try {
    const legacy = localStorage.getItem(LEGACY_LAST_USERNAME_KEY);
    if (!legacy?.trim()) return;
    rememberUsername(legacy.trim());
    localStorage.removeItem(LEGACY_LAST_USERNAME_KEY);
  } catch {
    /* ignore */
  }
}

export function LoginPage() {
  const { login, lastLoginError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recentUsernames, setRecentUsernames] = useState([]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('textilsoftPwdResetParams')) {
        navigate('/reset-password', { replace: true });
        return;
      }
      migrateLegacyLastUsername();
      const list = readUsernameHistory();
      setRecentUsernames(list);
      if (list.length) {
        setUsername((prev) => (prev.trim() ? prev : list[0]));
      }
    } catch {
      /* ignore */
    }
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (await login(username, password)) {
      try {
        rememberUsername(username);
        setRecentUsernames(readUsernameHistory());
      } catch {
        /* ignore */
      }
      notify.toast('Bienvenido.', 'success');
      navigate('/dashboard', { replace: true });
      return;
    }
    notify.toast(lastLoginError || 'Usuario o contrasena incorrectos', 'error');
    setPassword('');
  };

  return (
    <div className="app-screen" id="loginPage">
      <div className="logo-container">
        <svg className="logo" viewBox="0 0 200 100">
          <path d="M20,50 Q50,20 80,50 T140,50" fill="none" stroke="#fff" strokeWidth="2" />
          <path d="M30,60 Q60,30 90,60 T150,60" fill="none" stroke="#aaf" strokeWidth="2" />
          <path d="M40,70 Q70,40 100,70 T160,70" fill="none" stroke="#88f" strokeWidth="2" />
        </svg>
        <h1>TEXTILSOFT</h1>
      </div>
      <form className="login-form" onSubmit={onSubmit}>
        <div className="ts-login-field">
          <i className="fa-solid fa-user" aria-hidden />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Correo o usuario"
            list={recentUsernames.length ? 'loginUsernameHistoryList' : undefined}
            required
            autoComplete="username"
          />
        </div>
        {recentUsernames.length > 0 && (
          <datalist id="loginUsernameHistoryList">
            {recentUsernames.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        )}
        <div className="ts-login-field">
          <i className="fa-solid fa-lock" aria-hidden />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="ts-login-submit">
          <i className="fa-solid fa-right-to-bracket" aria-hidden />
          Iniciar sesión
        </button>
        <div className="login-links">
          <Link to="/recover">
            <i className="fa-solid fa-key" style={{ marginRight: '6px', opacity: 0.85 }} aria-hidden />
            Recuperar cuenta
          </Link>
        </div>
        <button type="button" className="register-btn" onClick={() => navigate('/register')}>
          <i className="fa-solid fa-user-plus" aria-hidden />
          Crear cuenta
        </button>
      </form>
    </div>
  );
}
