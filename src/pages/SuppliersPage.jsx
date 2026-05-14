import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { notify } from '../lib/notify.js';

function mapSupplierFromApi(item) {
  const raw = item.calificacion_promedio;
  const calificacionPromedio =
    raw !== undefined && raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : null;
  return {
    id: item.id,
    name: item.nombre,
    contactPerson: item.nombre_contacto || '',
    email: item.email || '',
    phone: item.telefono || '',
    address: item.direccion || '',
    notes: item.notas || '',
    productosSuministrados: item.productos_suministrados || '',
    calificacionPromedio,
  };
}

function mapSupplierToApi(item) {
  return {
    nombre: item.name,
    nombre_contacto: item.contactPerson || '',
    email: item.email || '',
    telefono: item.phone || '',
    direccion: item.address || '',
    notas: item.notes || '',
    productos_suministrados: item.productosSuministrados || '',
  };
}

export function SuppliersPage() {
  const { canPerform } = useAuth();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, supplier: null });
  const [form, setForm] = useState({
    id: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    productosSuministrados: '',
  });
  const [rateModal, setRateModal] = useState({ open: false, id: null });
  const [rateForm, setRateForm] = useState({ calidad: '', tiempos: '', precio: '', comentario: '' });
  const [histModal, setHistModal] = useState({ open: false, name: '', id: null, rows: [] });

  const refresh = useCallback(async () => {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const data = await api.get(`/suppliers/proveedores/${q}`);
    const arr = Array.isArray(data) ? data : data && Array.isArray(data.results) ? data.results : [];
    setList(arr.map(mapSupplierFromApi));
  }, [search]);

  useEffect(() => {
    refresh().catch((e) => notify.toast(e.message, 'error'));
  }, [refresh]);

  const openModal = (supplier) => {
    if (!canPerform('suppliers.manage') && supplier === null) {
      notify.toast('No tienes permisos.', 'warning');
      return;
    }
    if (supplier) {
      setForm({
        id: String(supplier.id),
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
        productosSuministrados: supplier.productosSuministrados || '',
      });
    } else {
      setForm({
        id: '',
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        productosSuministrados: '',
      });
    }
    setModal({ open: true, supplier });
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    if (!canPerform('suppliers.manage')) {
      notify.toast('No tienes permisos para guardar proveedores.', 'warning');
      return;
    }
    try {
      let saved;
      if (form.id) {
        saved = await api.put(`/suppliers/proveedores/${form.id}/`, mapSupplierToApi(form));
      } else {
        saved = await api.post('/suppliers/proveedores/', mapSupplierToApi(form));
      }
      setModal({ open: false, supplier: null });
      await refresh();
      if (saved?.id) {
        const calificar = await notify.confirm('¿Desea calificar este proveedor ahora?');
        if (calificar) {
          setRateModal({ open: true, id: saved.id });
          setRateForm({ calidad: '', tiempos: '', precio: '', comentario: '' });
        }
      }
    } catch (error) {
      notify.toast(`Error al guardar: ${error.message}`, 'error');
    }
  };

  const saveRating = async (e) => {
    e.preventDefault();
    if (!canPerform('suppliers.manage')) return;
    const calidad = parseInt(rateForm.calidad, 10);
    const tiempos = parseInt(rateForm.tiempos, 10);
    const precio = parseInt(rateForm.precio, 10);
    if (!rateModal.id || [calidad, tiempos, precio].some((n) => Number.isNaN(n))) {
      notify.toast('Seleccione puntuaciones válidas.', 'warning');
      return;
    }
    try {
      await api.post('/suppliers/calificaciones/', {
        proveedor: rateModal.id,
        calidad_suministro: calidad,
        cumplimiento_tiempos: tiempos,
        precio_calidad: precio,
        comentario: rateForm.comentario,
      });
      setRateModal({ open: false, id: null });
      await refresh();
      notify.toast('Calificación guardada.', 'success');
    } catch (error) {
      notify.toast(error.message, 'error');
    }
  };

  const openHistory = async (id, name) => {
    setHistModal({ open: true, id, name, rows: [] });
    try {
      const rows = await api.get(`/suppliers/calificaciones/?proveedor=${encodeURIComponent(id)}`);
      setHistModal({ open: true, id, name, rows: Array.isArray(rows) ? rows : [] });
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  };

  const deleteSupplier = async (id) => {
    if (!canPerform('suppliers.manage')) return;
    if (!(await notify.confirm('¿Eliminar este proveedor?'))) return;
    try {
      await api.delete(`/suppliers/proveedores/${id}/`);
      await refresh();
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  };

  return (
    <div className="app-screen" id="suppliersPage">
      <AppHeader />
      <div className="ts-page-title-block">
        <h1>
          <i className="fa-solid fa-truck-field" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
          Gestión de proveedores
        </h1>
        <p>Alta, edición, calificaciones e historial.</p>
      </div>
      <div className="ts-search-wrap">
        <i className="fa-solid fa-magnifying-glass" aria-hidden />
        <input
          type="text"
          className="light-input"
          placeholder="Buscar por nombre o contacto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => refresh()}
        />
      </div>
      <div className="table-container">
        <table className="report-table" id="suppliersTable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Calificación</th>
              <th>Evaluaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!list.length ? (
              <tr>
                <td colSpan={7} className="table-message">
                  No hay proveedores.
                </td>
              </tr>
            ) : (
              list.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.contactPerson}</td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>
                    {s.calificacionPromedio != null ? (
                      <span className="rating-badge">{s.calificacionPromedio.toFixed(1)}</span>
                    ) : (
                      'Sin calificar'
                    )}
                  </td>
                  <td>
                    <button type="button" className="secondary-button" onClick={() => openHistory(s.id, s.name)}>
                      Ver historial
                    </button>
                  </td>
                  <td className="actions">
                    {canPerform('suppliers.manage') ? (
                      <>
                        <button type="button" className="edit-btn" onClick={() => openModal(s)}>
                          Editar
                        </button>
                        <button type="button" className="delete-btn" onClick={() => deleteSupplier(s.id)}>
                          Eliminar
                        </button>
                      </>
                    ) : (
                      'Solo lectura'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {canPerform('suppliers.manage') && (
        <div className="page-actions-footer">
          <button type="button" className="accent-button" onClick={() => openModal(null)}>
            <i className="fa-solid fa-plus" style={{ marginRight: '8px' }} aria-hidden />
            Agregar proveedor
          </button>
        </div>
      )}

      {modal.open && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <button type="button" className="close-button" onClick={() => setModal({ open: false, supplier: null })}>
              &times;
            </button>
            <h2>{form.id ? 'Editar Proveedor' : 'Agregar Proveedor'}</h2>
            <form onSubmit={saveSupplier}>
              <label>Nombre del Proveedor</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <label>Contacto</label>
              <input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <label>Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <label>Dirección</label>
              <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              <label>Notas</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              <label>Productos que suministra</label>
              <textarea
                rows={3}
                value={form.productosSuministrados}
                onChange={(e) => setForm((f) => ({ ...f, productosSuministrados: e.target.value }))}
              />
              {form.id && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setModal({ open: false, supplier: null });
                    setRateModal({ open: true, id: parseInt(form.id, 10) });
                  }}
                >
                  Calificar Proveedor
                </button>
              )}
              <button type="submit">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {rateModal.open && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <button type="button" className="close-button" onClick={() => setRateModal({ open: false, id: null })}>
              &times;
            </button>
            <h2>Calificar Proveedor</h2>
            <form onSubmit={saveRating}>
              <label>Calidad del Suministro</label>
              <select required value={rateForm.calidad} onChange={(e) => setRateForm((f) => ({ ...f, calidad: e.target.value }))}>
                <option value="">Seleccionar</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <label>Cumplimiento de Tiempos</label>
              <select required value={rateForm.tiempos} onChange={(e) => setRateForm((f) => ({ ...f, tiempos: e.target.value }))}>
                <option value="">Seleccionar</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <label>Precio vs Calidad</label>
              <select required value={rateForm.precio} onChange={(e) => setRateForm((f) => ({ ...f, precio: e.target.value }))}>
                <option value="">Seleccionar</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <label>Comentario</label>
              <textarea value={rateForm.comentario} onChange={(e) => setRateForm((f) => ({ ...f, comentario: e.target.value }))} />
              <button type="submit">Guardar Calificación</button>
            </form>
          </div>
        </div>
      )}

      {histModal.open && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <button type="button" className="close-button" onClick={() => setHistModal({ open: false, name: '', id: null, rows: [] })}>
              &times;
            </button>
            <h2>Historial — {histModal.name}</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Calidad</th>
                  <th>Tiempos</th>
                  <th>Precio/calidad</th>
                  <th>Prom.</th>
                  <th>Comentario</th>
                </tr>
              </thead>
              <tbody>
                {!histModal.rows.length ? (
                  <tr>
                    <td colSpan={6} className="table-message">
                      Sin calificaciones.
                    </td>
                  </tr>
                ) : (
                  histModal.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.creado_en ? String(r.creado_en).replace('T', ' ').slice(0, 19) : '—'}</td>
                      <td>{r.calidad_suministro}</td>
                      <td>{r.cumplimiento_tiempos}</td>
                      <td>{r.precio_calidad}</td>
                      <td>{r.promedio != null ? Number(r.promedio).toFixed(1) : '—'}</td>
                      <td>{r.comentario || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
