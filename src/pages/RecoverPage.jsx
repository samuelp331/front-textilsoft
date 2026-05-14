import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notify } from '../lib/notify.js';
import { PublicPageHeader } from '../components/PublicPageHeader.jsx';

export function RecoverPage() {
  const { recoverAccount } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      notify.toast('Por favor ingrese su correo electronico.', 'warning');
      return;
    }
    try {
      const body = await recoverAccount(email);
      const detail = typeof body?.detail === 'string' ? body.detail : '';
      notify.toast(
        detail ? `${detail}\n\nCorreo consultado: ${email}` : `Solicitud procesada. Correo: ${email}`,
        'success',
      );
      navigate('/login');
    } catch (error) {
      notify.toast(`No fue posible procesar la recuperacion: ${error.message}`, 'error');
    }
  };

  return (
    <div className="app-screen" id="recoverAccountPage">
      <PublicPageHeader />
      <div className="recovery-container">
        <h1>RECUPERAR CUENTA</h1>
        <form className="recovery-form" onSubmit={onSubmit}>
          <p>Ingrese su correo electrónico para recuperar su cuenta.</p>
          <div className="ts-login-field">
            <i className="fa-solid fa-envelope" aria-hidden />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </div>
          <button type="submit">
            <i className="fa-solid fa-paper-plane" style={{ marginRight: '8px' }} aria-hidden />
            Enviar instrucciones
          </button>
        </form>
      </div>
    </div>
  );
}
