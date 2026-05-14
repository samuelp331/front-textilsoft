import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import * as inventoryData from '../lib/inventoryData.js';
import { notify } from '../lib/notify.js';

function rolDisplayName(slug) {
  const map = { operario: 'Operario', bodeguero: 'Bodeguero', supervisor: 'Supervisor', administrador: 'Administrador' };
  return map[slug] || slug || '—';
}

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [allAlerts, setAllAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [uForm, setUForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'operario',
    estado: 'activo',
  });

  const load = async () => {
    try {
      const data = await api.get('/admin/resumen/');
      setResumen(data);
    } catch {
      await inventoryData.loadProducts();
      const products = inventoryData.getProducts();
      let proveedoresCount = 0;
      try {
        const sup = await api.get('/suppliers/proveedores/');
        proveedoresCount = Array.isArray(sup) ? sup.length : 0;
      } catch {
        /* ignore */
      }
      let movimientosCount = 0;
      try {
        const movs = await inventoryData.getInventoryMovements();
        movimientosCount = Array.isArray(movs) ? movs.length : 0;
      } catch {
        /* ignore */
      }
      setResumen({
        usuarios_activos: null,
        productos: products.length,
        productos_stock_ok: products.filter((p) => Number(p.quantity) > Number(p.minQuantity)).length,
        proveedores: proveedoresCount,
        movimientos: movimientosCount,
      });
    }
    try {
      const al = await inventoryData.checkInventoryAlerts();
      setAllAlerts(al);
    } catch {
      setAllAlerts([]);
    }
    try {
      const rows = await api.get('/admin/usuarios/');
      setUsers(Array.isArray(rows) ? rows : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lowStockCount = allAlerts.filter((a) => a.type === 'low-stock').length;
  const expiringCount = allAlerts.filter((a) => a.type === 'expiration').length;
  const expiredCount = allAlerts.filter((a) => a.type === 'expired').length;
  const vencimientoIncidencias = expiringCount + expiredCount;
  const maxH = 150;
  const totalBars = lowStockCount + vencimientoIncidencias + (resumen?.productos_stock_ok ?? 0);
  const denom = totalBars > 0 ? totalBars : 1;

  const openEdit = async (id) => {
    try {
      const u = await api.get(`/admin/usuarios/${id}/`);
      setEditId(String(u.id));
      setUForm({
        nombre: u.nombre || '',
        email: u.email || '',
        password: '',
        rol: u.rol?.nombre || 'operario',
        estado: u.estado === 'inactivo' ? 'inactivo' : 'activo',
      });
      setFormOpen(true);
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  };

  const showNew = () => {
    setEditId('');
    setUForm({ nombre: '', email: '', password: '', rol: 'operario', estado: 'activo' });
    setFormOpen(true);
  };

  const saveUser = async (e) => {
    e.preventDefault();
    const { nombre, email, password, rol, estado } = uForm;
    if (!nombre || !email || !rol) {
      notify.toast('Complete nombre, correo y rol.', 'warning');
      return;
    }
    try {
      if (!editId) {
        if (!password || password.length < 6) {
          notify.toast('La contraseña debe tener al menos 6 caracteres.', 'warning');
          return;
        }
        await api.post('/admin/usuarios/', { nombre, email, password, rol });
      } else {
        const body = { nombre, email, rol, estado };
        if (password && password.length >= 6) body.password = password;
        await api.patch(`/admin/usuarios/${editId}/`, body);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      notify.toast(err.message, 'error');
    }
  };

  const deactivate = async (id) => {
    if (!(await notify.confirm('¿Desactivar esta cuenta?'))) return;
    try {
      await api.delete(`/admin/usuarios/${id}/`);
      await load();
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  };

  const myId = user?.id;

  return (
    <div className="app-screen" id="adminPage">
      <AppHeader />
      <div className="admin-container">
        <div className="ts-page-title-block">
          <h1>
            <i className="fa-solid fa-shield-halved" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
            Panel administrativo
          </h1>
          <p>Indicadores del sistema y gestión de usuarios.</p>
        </div>
        <div className="admin-quick-links">
          <span className="admin-quick-links-label">Accesos rápidos</span>
          <button type="button" className="admin-quick-btn" onClick={() => navigate('/inventory')}>
            <i className="fa-solid fa-boxes-stacked" aria-hidden /> Inventario
          </button>
          <button type="button" className="admin-quick-btn" onClick={() => navigate('/alerts')}>
            <i className="fa-solid fa-bell" aria-hidden /> Alertas
          </button>
          <button type="button" className="admin-quick-btn" onClick={() => navigate('/suppliers')}>
            <i className="fa-solid fa-truck-field" aria-hidden /> Proveedores
          </button>
          <button type="button" className="admin-quick-btn" onClick={() => navigate('/reports')}>
            <i className="fa-solid fa-chart-pie" aria-hidden /> Reportes
          </button>
          <button type="button" className="admin-quick-btn" onClick={() => navigate('/reports/movements')}>
            <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden /> Movimientos
          </button>
        </div>

        <section className="admin-section">
          <div className="admin-stats-grid">
            <div className="stat-card">
              <div className="stat-value">{resumen?.productos ?? '—'}</div>
              <div className="stat-label">Productos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{allAlerts.length}</div>
              <div className="stat-label">Alertas activas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{resumen?.usuarios_activos ?? '—'}</div>
              <div className="stat-label">Usuarios activos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{resumen?.proveedores ?? '—'}</div>
              <div className="stat-label">Proveedores</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{lowStockCount}</div>
              <div className="stat-label">Stock bajo</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{vencimientoIncidencias}</div>
              <div className="stat-label">Vencimiento</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{resumen?.productos_stock_ok ?? '—'}</div>
              <div className="stat-label">Sobre stock mínimo</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{resumen?.movimientos ?? '—'}</div>
              <div className="stat-label">Movimientos</div>
            </div>
          </div>
          <div className="admin-chart" style={{ marginTop: '1.5rem' }}>
            <div className="chart-bars">
              <div className="chart-bar-group">
                <div
                  className="chart-bar"
                  id="barLowStock"
                  style={{ height: `${(lowStockCount / denom) * maxH}px` }}
                />
                <span className="chart-label">Stock bajo</span>
              </div>
              <div className="chart-bar-group">
                <div
                  className="chart-bar"
                  id="barExpiring"
                  style={{ height: `${(vencimientoIncidencias / denom) * maxH}px` }}
                />
                <span className="chart-label">Vencimiento</span>
              </div>
              <div className="chart-bar-group">
                <div
                  className="chart-bar"
                  id="barOk"
                  style={{ height: `${((resumen?.productos_stock_ok || 0) / denom) * maxH}px` }}
                />
                <span className="chart-label">Sobre mínimo</span>
              </div>
            </div>
          </div>
          <div className="admin-alerts-list" id="adminAlertsList" style={{ marginTop: '1rem' }}>
            {!allAlerts.length ? (
              <p className="no-alerts">No hay alertas activas.</p>
            ) : (
              allAlerts.slice(0, 10).map((alert) => {
                let message = '';
                if (alert.type === 'low-stock') message = `Stock: ${alert.current} de ${alert.minimum}`;
                else if (alert.type === 'expiration') message = `Vence en ${alert.daysLeft} dias`;
                else if (alert.type === 'expired') message = `Vencio hace ${alert.daysOverdue} dias`;
                const ubic = alert.ubicacion ? ` (${alert.ubicacion})` : '';
                return (
                  <div key={`${alert.type}-${alert.productId}`} className={`admin-alert-item ${alert.type}`}>
                    <div className="admin-alert-title">
                      {alert.productName}
                      {ubic}
                    </div>
                    <div className="admin-alert-message">{message}</div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="admin-section admin-users-section">
          <h2>Gestión de usuarios</h2>
          <div className="admin-users-toolbar">
            <button type="button" className="admin-user-new-btn" onClick={showNew}>
              Nuevo usuario
            </button>
          </div>
          {formOpen && (
            <form className="admin-user-form" onSubmit={saveUser}>
              <h3 className="admin-user-form-title">{editId ? 'Editar usuario' : 'Nuevo usuario'}</h3>
              <label>Nombre</label>
              <input value={uForm.nombre} onChange={(e) => setUForm((f) => ({ ...f, nombre: e.target.value }))} required />
              <label>Correo</label>
              <input type="email" value={uForm.email} onChange={(e) => setUForm((f) => ({ ...f, email: e.target.value }))} required />
              <label>{editId ? 'Contraseña (opcional)' : 'Contraseña'}</label>
              <input type="password" value={uForm.password} onChange={(e) => setUForm((f) => ({ ...f, password: e.target.value }))} />
              <label>Rol</label>
              <select value={uForm.rol} onChange={(e) => setUForm((f) => ({ ...f, rol: e.target.value }))}>
                <option value="operario">Operario</option>
                <option value="bodeguero">Bodeguero</option>
                <option value="supervisor">Supervisor</option>
                <option value="administrador">Administrador</option>
              </select>
              {editId && (
                <label>Estado</label>
              )}
              {editId && (
                <select value={uForm.estado} onChange={(e) => setUForm((f) => ({ ...f, estado: e.target.value }))}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              )}
              <div className="admin-user-form-actions">
                <button type="submit">Guardar</button>
                <button type="button" className="secondary-button admin-user-cancel-btn" onClick={() => setFormOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
          <table className="report-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{rolDisplayName(u.rol?.nombre)}</td>
                  <td>{u.estado === 'activo' ? 'Activo' : 'Inactivo'}</td>
                  <td className="admin-users-actions">
                    <button type="button" className="admin-user-edit-btn" onClick={() => openEdit(u.id)}>
                      Editar
                    </button>
                    {u.estado === 'activo' && u.id !== myId && (
                      <button type="button" className="admin-user-deactivate-btn" onClick={() => deactivate(u.id)}>
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
