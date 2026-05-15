import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import * as inventoryData from '../lib/inventoryData.js';
import { notify } from '../lib/notify.js';
import { setPendingReabastecer } from '../lib/alertsReabastecer.js';

function formatDateAlert(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function AlertsPage() {
  const { canPerform } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notif, setNotif] = useState(() => inventoryData.getNotificationSettings());

  const load = useCallback(async () => {
    try {
      const rows = await inventoryData.checkInventoryAlerts();
      setAlerts(rows);
    } catch {
      setAlerts([]);
      notify.toast('No se pudieron cargar las alertas.', 'error');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const rows = await api.get('/alerts/resoluciones/');
      setHistory(Array.isArray(rows) ? rows : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  const registerResolution = async (productId, tipoAlerta, accion, notas = '') => {
    if (!canPerform('inventory.movements.manage')) return;
    await api.post('/alerts/resoluciones/', {
      producto: productId,
      tipo_alerta: tipoAlerta,
      accion,
      notas: notas || '',
    });
  };

  const onRestock = async (productId) => {
    setPendingReabastecer(productId);
    navigate('/inventory', { state: { openMovement: { productId, type: 'entrada' } } });
  };

  const onExtend = async (productId) => {
    await inventoryData.loadProducts();
    const product = inventoryData.getProductById(productId);
    if (!product) return;
    const newDate = await notify.prompt(
      `Nueva fecha de vencimiento para ${product.name} (YYYY-MM-DD):`,
      product.expirationDate || '',
    );
    if (!newDate) return;
    await inventoryData.updateProduct(productId, { expirationDate: newDate });
    try {
      await registerResolution(productId, 'expiration', 'extender', `Nueva fecha: ${newDate}`);
    } catch {
      /* ignore */
    }
    await load();
    await loadHistory();
  };

  const onDiscard = async (productId) => {
    await inventoryData.loadProducts();
    const product = inventoryData.getProductById(productId);
    if (!product) return;
    const quantityText = await notify.prompt(`Cantidad a descartar de ${product.name}:`, String(product.quantity));
    const quantity = Number(quantityText);
    if (!quantity || quantity < 1) return;
    try {
      await inventoryData.recordMovement({
        date: new Date().toISOString().split('T')[0],
        productId,
        type: 'salida',
        quantity,
        reason: 'Descarte desde alerta de inventario',
      });
      try {
        await registerResolution(productId, 'expired', 'descartar', `Cantidad descartada: ${quantity}`);
      } catch {
        /* ignore */
      }
      await load();
      await loadHistory();
    } catch (error) {
      notify.toast(`No se pudo completar el descarte: ${error?.message || error}`, 'error');
    }
  };

  const saveNotifSettings = (e) => {
    e.preventDefault();
    inventoryData.updateNotificationSettings(notif);
    if (notif.desktop?.enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    notify.toast('Preferencias guardadas.', 'success');
    setSettingsOpen(false);
  };

  const renderAlert = (alert, rowClass) => {
    const ubi = alert.ubicacion ? ` (${alert.ubicacion})` : '';
    return (
      <div key={`${alert.type}-${alert.productId}`} className={`alert-item ${rowClass}`}>
        {alert.type === 'low-stock' && (
          <>
            <div className="alert-content">
              <div className="alert-title">
                {alert.productName}
                {ubi}
              </div>
              <div className="alert-message">
                Stock: <span className="alert-critical">{alert.current}</span> de {alert.minimum}
              </div>
            </div>
            <div className="alert-actions">
              <button type="button" className="alert-action-button primary-button" onClick={() => onRestock(alert.productId)}>
                Reabastecer
              </button>
            </div>
          </>
        )}
        {alert.type === 'expiration' && (
          <>
            <div className="alert-content">
              <div className="alert-title">
                {alert.productName}
                {ubi}
              </div>
              <div className="alert-message">
                Vence en <span className="alert-warning">{alert.daysLeft} dias</span> (
                {formatDateAlert(alert.expirationDate)})
              </div>
            </div>
            <div className="alert-actions">
              <button type="button" className="alert-action-button primary-button" onClick={() => onExtend(alert.productId)}>
                Extender
              </button>
            </div>
          </>
        )}
        {alert.type === 'expired' && (
          <>
            <div className="alert-content">
              <div className="alert-title">
                {alert.productName}
                {ubi}
              </div>
              <div className="alert-message">
                Vencio hace <span className="alert-critical">{alert.daysOverdue} dias</span> (
                {formatDateAlert(alert.expirationDate)})
              </div>
            </div>
            <div className="alert-actions">
              <button type="button" className="alert-action-button primary-button" onClick={() => onDiscard(alert.productId)}>
                Descartar
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const expired = alerts.filter((a) => a.type === 'expired');
  const expiration = alerts.filter((a) => a.type === 'expiration');
  const low = alerts.filter((a) => a.type === 'low-stock');

  return (
    <div className="app-screen" id="alertsPage">
      <AppHeader />
      <div className="alerts-container">
        <div className="alerts-header">
          <h1>
            <i className="fa-solid fa-bell" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
            Alertas de inventario
          </h1>
          <div className="alerts-actions">
            <button type="button" className="config-button" onClick={() => setSettingsOpen(true)}>
              <i className="fa-solid fa-gear" style={{ marginRight: '8px' }} aria-hidden />
              Configuración
            </button>
            <button
              type="button"
              className="refresh-button"
              onClick={async () => {
                await load();
                await loadHistory();
                notify.toast('Alertas actualizadas.', 'success');
              }}
            >
              <i className="fa-solid fa-rotate" style={{ marginRight: '8px' }} aria-hidden />
              Actualizar
            </button>
          </div>
        </div>
        <div className="alerts-stats">
          <div className="alert-summary">
            <span className="alert-count" style={{ display: alerts.length > 0 ? 'inline-flex' : 'none' }}>
              {alerts.length}
            </span>
            <span className="alert-label">Alertas activas</span>
          </div>
        </div>
        <div className="alerts-list">
          {!alerts.length ? (
            <div className="no-alerts-message">No hay alertas pendientes.</div>
          ) : (
            <>
              {expired.length > 0 && (
                <div className="alert-section expired-section">
                  <h3>Productos Vencidos</h3>
                  {expired.map((a) => renderAlert(a, 'expired-alert'))}
                </div>
              )}
              {expiration.length > 0 && (
                <div className="alert-section expiration-section">
                  <h3>Productos Proximos a Vencer</h3>
                  {expiration.map((a) => renderAlert(a, 'expiration-alert'))}
                </div>
              )}
              {low.length > 0 && (
                <div className="alert-section low-stock-section">
                  <h3>Productos con Stock Bajo</h3>
                  {low.map((a) => renderAlert(a, 'low-stock-alert'))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="alerts-history-section">
          <h2>Historial de alertas atendidas</h2>
          <div className="alerts-history-list">
            {!history.length ? (
              <p className="table-message">Aún no hay alertas registradas como atendidas.</p>
            ) : (
              <div className="ts-table-scroll">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Acción</th>
                      <th>Usuario</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 80).map((r) => (
                      <tr key={r.id}>
                        <td>{r.creado_en ? String(r.creado_en).replace('T', ' ').slice(0, 19) : '—'}</td>
                        <td>{r.producto_nombre}</td>
                        <td>{r.tipo_alerta}</td>
                        <td>{r.accion}</td>
                        <td>{r.usuario_nombre}</td>
                        <td>{r.notas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content notification-settings-modal">
            <button type="button" className="close-button" onClick={() => setSettingsOpen(false)}>
              &times;
            </button>
            <h2>Configuración de alertas</h2>
            <form onSubmit={saveNotifSettings}>
              <div className="settings-group">
                <h3>Canales de notificación</h3>
                <label className="notification-channel-label">
                  <input
                    type="checkbox"
                    checked={!!notif.inApp?.enabled}
                    onChange={(e) => setNotif((s) => ({ ...s, inApp: { enabled: e.target.checked } }))}
                  />
                  <span>Notificaciones dentro de TextilSoft</span>
                </label>
                <label className="notification-channel-label">
                  <input
                    type="checkbox"
                    checked={!!notif.desktop?.enabled}
                    onChange={(e) => setNotif((s) => ({ ...s, desktop: { enabled: e.target.checked } }))}
                  />
                  <span>Notificaciones del navegador</span>
                </label>
                <label className="notification-channel-label">
                  <input
                    type="checkbox"
                    checked={!!notif.email?.enabled}
                    onChange={(e) => setNotif((s) => ({ ...s, email: { ...s.email, enabled: e.target.checked } }))}
                  />
                  <span>Aviso por correo electrónico</span>
                </label>
                {notif.email?.enabled && (
                  <div className="notification-email-block">
                    <label htmlFor="notifyEmailAddress">Correo para avisos</label>
                    <input
                      id="notifyEmailAddress"
                      type="email"
                      value={notif.email.address || ''}
                      onChange={(e) =>
                        setNotif((s) => ({ ...s, email: { ...s.email, address: e.target.value } }))
                      }
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                )}
              </div>
              <button type="submit" className="primary-button notification-settings-save">
                Guardar preferencias
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
