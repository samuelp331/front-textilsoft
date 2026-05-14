import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ReportsHubPage() {
  const navigate = useNavigate();
  const { hasPageAccess } = useAuth();

  return (
    <div className="app-screen" id="reportsPage">
      <AppHeader />
      <div className="ts-page-title-block">
        <h1>
          <i className="fa-solid fa-chart-pie" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
          Reportes
        </h1>
        <p>Consultas de movimientos y análisis de consumo.</p>
      </div>
      <div className="ts-page-panel">
        <div className="reports-grid">
          {hasPageAccess('inventoryMovementsPage') && (
            <div
              className="report-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/reports/movements')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/reports/movements')}
            >
              <div className="report-icon">
                <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden />
              </div>
              <h3>Movimientos de Inventario</h3>
              <p>Visualiza todas las entradas y salidas de productos del inventario.</p>
            </div>
          )}
          {hasPageAccess('consumptionReportPage') && (
            <div
              className="report-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/reports/consumption')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/reports/consumption')}
            >
              <div className="report-icon">
                <i className="fa-solid fa-chart-line" aria-hidden />
              </div>
              <h3>Consumo de Materiales</h3>
              <p>Analiza el consumo de materiales en diferentes períodos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
