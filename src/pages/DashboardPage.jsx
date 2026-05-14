import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  {
    route: '/profile',
    pageId: 'profilePage',
    label: 'Perfil',
    hint: 'Datos personales y foto',
    icon: 'fa-solid fa-user',
  },
  {
    route: '/inventory',
    pageId: 'productPage',
    label: 'Inventario',
    hint: 'Productos, movimientos e importación',
    icon: 'fa-solid fa-boxes-stacked',
  },
  {
    route: '/reports',
    pageId: 'reportsPage',
    label: 'Reportes',
    hint: 'Movimientos y consumo de materiales',
    icon: 'fa-solid fa-chart-column',
  },
  {
    route: '/alerts',
    pageId: 'alertsPage',
    label: 'Alertas',
    hint: 'Stock bajo y vencimientos',
    icon: 'fa-solid fa-bell',
  },
  {
    route: '/suppliers',
    pageId: 'suppliersPage',
    label: 'Proveedores',
    hint: 'Gestión y calificaciones',
    icon: 'fa-solid fa-truck-field',
  },
  {
    route: '/admin',
    pageId: 'adminPage',
    label: 'Administración',
    hint: 'Usuarios y resumen del sistema',
    icon: 'fa-solid fa-shield-halved',
  },
];

export function DashboardPage() {
  const { logout, hasPageAccess, user } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => hasPageAccess(n.pageId));

  return (
    <div className="app-screen ts-dashboard" id="dashboardPage">
      <header className="ts-app-header">
        <span className="back-btn-placeholder" style={{ width: '44px', visibility: 'hidden' }} aria-hidden>
          ·
        </span>
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

      <div className="ts-dashboard-top">
        <div className="ts-dashboard-intro">
          <h1>Inicio</h1>
          <p>
            Hola{user?.name ? `, ${user.name}` : ''}. Elegí un módulo para continuar gestionando la operación.
          </p>
        </div>
      </div>

      <div className="ts-dashboard-grid">
        {items.map((n) => (
          <button
            key={n.route}
            type="button"
            className="ts-dash-card"
            onClick={() => navigate(n.route)}
          >
            <div className="ts-dash-card-icon" aria-hidden>
              <i className={n.icon} />
            </div>
            <h2 className="ts-dash-card-title">{n.label}</h2>
            <p className="ts-dash-card-hint">{n.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
