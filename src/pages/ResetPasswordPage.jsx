import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notify } from '../lib/notify.js';
import { PublicPageHeader } from '../components/PublicPageHeader.jsx';

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [params, setParams] = useState(null);

  useEffect(() => {
    let raw = null;
    try {
      raw = sessionStorage.getItem('textilsoftPwdResetParams');
    } catch {
      raw = null;
    }
    if (!raw) {
      setParams(null);
      return;
    }
    try {
      setParams(JSON.parse(raw));
    } catch {
      setParams(null);
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!params?.uid || !params?.token) {
      notify.toast('Enlace invalido o expirado. Solicita recuperar la cuenta desde el inicio de sesion.', 'error');
      return;
    }
    if (pwd1.length < 6 || pwd2.length < 6) {
      notify.toast('La contrasena debe tener al menos 6 caracteres.', 'warning');
      return;
    }
    if (pwd1 !== pwd2) {
      notify.toast('Las contrasenas no coinciden.', 'warning');
      return;
    }
    try {
      const body = await resetPassword(params.uid, params.token, pwd1, pwd2);
      try {
        sessionStorage.removeItem('textilsoftPwdResetParams');
      } catch {
        /* ignore */
      }
      const detail = typeof body?.detail === 'string' ? body.detail : '';
      notify.toast(detail || 'Contrasena actualizada.', 'success');
      navigate('/login');
    } catch (error) {
      notify.toast(`No se pudo restablecer la contrasena: ${error.message}`, 'error');
    }
  };

  return (
    <div className="app-screen" id="resetPasswordPage">
      <PublicPageHeader
        onExit={() => {
          try {
            sessionStorage.removeItem('textilsoftPwdResetParams');
          } catch {
            /* ignore */
          }
          navigate('/login');
        }}
      />
      <div className="recovery-container">
        <h1>NUEVA CONTRASEÑA</h1>
        {!params ? (
          <p className="table-message">No hay un enlace de restablecimiento válido. Vuelva al inicio de sesión.</p>
        ) : (
          <form className="recovery-form" autoComplete="off" onSubmit={onSubmit}>
            <p>Elegí una contraseña nueva (mínimo 6 caracteres).</p>
            <input
              type="password"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              placeholder="Nueva contraseña"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="Confirmar contraseña"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <button type="submit">Guardar contraseña</button>
          </form>
        )}
      </div>
    </div>
  );
}
