import { useNavigate } from 'react-router-dom';

/** Cabecera para registro, recuperación y restablecimiento (misma línea visual que el dashboard). */
export function PublicPageHeader({ onExit }) {
  const navigate = useNavigate();
  const handleExit = onExit || (() => navigate('/login'));

  return (
    <header className="ts-app-header">
      <button
        type="button"
        className="ts-btn-icon ts-btn-ghost back-btn"
        onClick={() => navigate('/login')}
      >
        <i className="fa-solid fa-arrow-left" aria-hidden />
        <span>Volver</span>
      </button>
      <div className="logo-small">
        <svg viewBox="0 0 100 50" aria-hidden>
          <path d="M10,25 Q25,10 40,25 T70,25" fill="none" stroke="#243044" strokeWidth="2" />
        </svg>
        <span>TEXTILSOFT</span>
      </div>
      <button type="button" className="ts-btn-icon ts-btn-primary-nav" onClick={handleExit}>
        <i className="fa-solid fa-xmark" aria-hidden />
        <span>Salir</span>
      </button>
    </header>
  );
}
