import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function AppHeader({ showBack = true }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const goBack = () => {
    navigate(-1);
  };

  return (
    <header className="ts-app-header">
      {showBack ? (
        <button type="button" className="ts-btn-icon ts-btn-ghost back-btn" onClick={goBack}>
          <i className="fa-solid fa-arrow-left" aria-hidden />
          <span>Volver</span>
        </button>
      ) : (
        <span className="back-btn-placeholder" style={{ width: '44px', visibility: 'hidden' }} aria-hidden>
          ·
        </span>
      )}
      <div className="logo-small">
        <svg viewBox="0 0 100 50" aria-hidden>
          <path d="M10,25 Q25,10 40,25 T70,25" fill="none" stroke="#243044" strokeWidth="2" />
        </svg>
        <span>TEXTILSOFT</span>
      </div>
      <button
        type="button"
        className="ts-btn-icon ts-btn-primary-nav"
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        <i className="fa-solid fa-right-from-bracket" aria-hidden />
        <span>Salir</span>
      </button>
    </header>
  );
}
