import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as inventoryData from '../lib/inventoryData.js';
import { notify } from '../lib/notify.js';
import { importInventoryFile } from '../lib/csvImport.js';
import { api } from '../lib/api.js';
import { clearPendingReabastecer, registerReabastecerIfPendingFromAlert } from '../lib/alertsReabastecer.js';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO');
}

const emptyProductForm = {
  code: '',
  name: '',
  category: '',
  ubicacionId: '',
  description: '',
  quantity: 0,
  minQuantity: 10,
  price: 0,
  unit: 'unidad',
  expirationDate: '',
  notifyDaysBefore: 30,
};

export function InventoryPage() {
  const { canPerform } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterUb, setFilterUb] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDelete, setSelectedDelete] = useState(() => new Set());
  const [deletionRows, setDeletionRows] = useState([]);
  const [productModal, setProductModal] = useState({ open: false, mode: 'add', editId: null });
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [csvOpen, setCsvOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    productId: '',
    type: '',
    quantity: '',
    reason: '',
  });

  const canManageProducts = canPerform('inventory.products.manage');
  const canManageMovements = canPerform('inventory.movements.manage');
  const canCreateMovements = canPerform('inventory.movements.create');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search) filters.search = search;
      if (filterCat) filters.categoria = filterCat;
      if (filterUb) filters.ubicacion_id = filterUb;
      await inventoryData.loadProducts(filters);
      setProducts(inventoryData.getProducts());
      const u = await inventoryData.loadUbicaciones();
      setUbicaciones(u);
      const c = await inventoryData.getCategorias();
      setCategorias(c);
      if (canManageProducts) {
        try {
          const rows = await api.get('/inventory/eliminaciones-productos/?limite=15');
          setDeletionRows(Array.isArray(rows) ? rows : []);
        } catch {
          setDeletionRows([]);
        }
      } else {
        setDeletionRows([]);
      }
    } catch (e) {
      notify.toast(e.message || 'Error al cargar inventario', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterCat, filterUb, canManageProducts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const st = location.state?.openMovement;
    if (!st?.productId) return;
    (async () => {
      await inventoryData.loadProducts();
      setProducts(inventoryData.getProducts());
      setUpdateForm({
        productId: String(st.productId),
        type: st.type || 'entrada',
        quantity: '',
        reason: '',
      });
      setUpdateOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    })();
  }, [location.state, location.pathname, navigate]);

  const openAdd = async () => {
    if (!canManageProducts) {
      notify.toast('No tienes permisos para agregar productos.', 'warning');
      return;
    }
    const u = await inventoryData.loadUbicaciones();
    setUbicaciones(u);
    setProductForm({ ...emptyProductForm, minQuantity: 10, notifyDaysBefore: 30 });
    setProductModal({ open: true, mode: 'add', editId: null });
  };

  const openEdit = async (id) => {
    if (!canManageProducts) return;
    await inventoryData.loadProducts();
    const p = inventoryData.getProductById(id);
    if (!p) return;
    const u = await inventoryData.loadUbicaciones();
    setUbicaciones(u);
    setProductForm({
      code: p.code || '',
      name: p.name || '',
      category: p.category || '',
      ubicacionId: p.ubicacionId ? String(p.ubicacionId) : '',
      description: p.description || '',
      quantity: p.quantity ?? 0,
      minQuantity: p.minQuantity ?? 0,
      price: p.price ?? 0,
      unit: p.unit || 'unidad',
      expirationDate: p.expirationDate || '',
      notifyDaysBefore: p.notifyDaysBefore ?? 30,
    });
    setProductModal({ open: true, mode: 'edit', editId: id });
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (!canManageProducts) return;
    const f = productForm;
    if (!f.code || !f.name || !f.category) {
      notify.toast('Complete código, nombre y categoría.', 'warning');
      return;
    }
    const payload = {
      code: f.code.trim(),
      name: f.name.trim(),
      category: f.category.trim(),
      ubicacionId: f.ubicacionId ? parseInt(f.ubicacionId, 10) : null,
      description: f.description.trim(),
      quantity: parseInt(f.quantity, 10),
      minQuantity: parseInt(f.minQuantity, 10),
      price: parseFloat(f.price),
      unit: f.unit,
      expirationDate: f.expirationDate || null,
      notifyDaysBefore: parseInt(f.notifyDaysBefore, 10) || 30,
    };
    try {
      if (productModal.mode === 'edit' && productModal.editId) {
        await inventoryData.updateProduct(productModal.editId, payload);
        notify.toast('Producto actualizado.', 'success');
      } else {
        await inventoryData.addProduct(payload);
        notify.toast('Producto creado.', 'success');
      }
      setProductModal({ open: false, mode: 'add', editId: null });
      await refresh();
    } catch (err) {
      notify.toast(err.message || 'Error al guardar', 'error');
    }
  };

  const openUpdateModal = async (opts = {}) => {
    if (!(canManageMovements || canCreateMovements)) {
      notify.toast('No tienes permisos para actualizar inventario.', 'warning');
      return;
    }
    if (!opts.keepPendingAlertReabastecer) clearPendingReabastecer();
    await inventoryData.loadProducts();
    setProducts(inventoryData.getProducts());
    setUpdateForm({ productId: '', type: canCreateMovements && !canManageMovements ? 'salida' : '', quantity: '', reason: '' });
    setUpdateOpen(true);
  };

  const submitMovement = async (e) => {
    e.preventDefault();
    if (!(canManageMovements || canCreateMovements)) return;
    const { productId, type, quantity: qStr, reason } = updateForm;
    if (canCreateMovements && !canManageMovements && type !== 'salida') {
      notify.toast('Como operario solo puedes registrar salidas de insumos.', 'warning');
      return;
    }
    const quantity = parseInt(qStr, 10);
    if (!productId || !type || Number.isNaN(quantity) || !reason) {
      notify.toast('Complete todos los campos.', 'warning');
      return;
    }
    if ((type === 'entrada' || type === 'salida') && quantity <= 0) {
      notify.toast('Para entradas y salidas la cantidad debe ser mayor a cero.', 'warning');
      return;
    }
    const product = inventoryData.getProductById(parseInt(productId, 10));
    if (!product) {
      notify.toast('Producto no encontrado', 'error');
      return;
    }
    if (type === 'salida' && product.quantity < quantity) {
      notify.toast(`No hay suficiente stock. Stock actual: ${product.quantity}`, 'warning');
      return;
    }
    const originalQuantity = product.quantity;
    let movementQuantity = quantity;
    if (type === 'ajuste') {
      movementQuantity = quantity - originalQuantity;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await inventoryData.recordMovement({
        date: today,
        productId: parseInt(productId, 10),
        type,
        quantity: movementQuantity,
        reason,
      });
      if (type === 'entrada') {
        try {
          await registerReabastecerIfPendingFromAlert(
            parseInt(productId, 10),
            quantity,
            reason,
            canPerform,
          );
        } catch (err) {
          console.warn(err);
        }
      }
      setUpdateOpen(false);
      await refresh();
      notify.toast('Inventario actualizado correctamente.', 'success');
    } catch (err) {
      notify.toast(err.message || 'Error al registrar movimiento', 'error');
    }
  };

  const toggleDeleteMode = async () => {
    if (!canManageProducts) {
      notify.toast('No tienes permisos para eliminar productos.', 'warning');
      return;
    }
    if (!deleteMode) {
      await inventoryData.loadProducts();
      setProducts(inventoryData.getProducts());
      setSelectedDelete(new Set());
      setDeleteMode(true);
      return;
    }
    setDeleteMode(false);
    await refresh();
  };

  const confirmDelete = async () => {
    if (selectedDelete.size === 0) {
      notify.toast('Seleccione al menos un producto.', 'warning');
      return;
    }
    if (!(await notify.confirm(`¿Eliminar ${selectedDelete.size} producto(s)?`))) return;
    let n = 0;
    for (const id of selectedDelete) {
      try {
        await inventoryData.deleteProduct(id);
        n += 1;
      } catch {
        /* continue */
      }
    }
    notify.toast(`Se eliminaron ${n} producto(s).`, 'success');
    setDeleteMode(false);
    await refresh();
  };

  const runImport = async (file) => {
    await importInventoryFile(file, async () => {
      setCsvOpen(false);
      await refresh();
    });
  };

  return (
    <div className="app-screen" id="productPage">
      <AppHeader />
      <div className="ts-page-title-block">
        <h1>
          <i className="fa-solid fa-boxes-stacked" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
          Inventario
        </h1>
        <p>Listado de productos, altas, bajas y movimientos de stock.</p>
      </div>
      <div className="product-options">
        {canManageProducts && (
          <button type="button" onClick={openAdd}>
            <i className="fa-solid fa-plus" aria-hidden />
            Agregar producto
          </button>
        )}
        {(canManageMovements || canCreateMovements) && (
          <button type="button" onClick={() => openUpdateModal()}>
            <i className="fa-solid fa-arrows-rotate" aria-hidden />
            Actualizar inventario
          </button>
        )}
        {canManageProducts && (
          <button type="button" onClick={toggleDeleteMode}>
            <i className="fa-solid fa-trash-can" aria-hidden />
            {deleteMode ? 'Volver al listado' : 'Eliminar producto'}
          </button>
        )}
        {canManageProducts && (
          <button type="button" onClick={() => setCsvOpen(true)}>
            <i className="fa-solid fa-file-import" aria-hidden />
            Importar datos
          </button>
        )}
      </div>

      <div id="productContent">
        {deleteMode ? (
          <div>
            <h2>Eliminar Productos</h2>
            <p>Seleccione los productos que desea eliminar:</p>
            <div className="delete-product-list">
              {products.map((item) => (
                <div key={item.id} className="delete-product-item">
                  <input
                    type="checkbox"
                    id={`delete-${item.id}`}
                    checked={selectedDelete.has(item.id)}
                    onChange={(e) => {
                      const s = new Set(selectedDelete);
                      if (e.target.checked) s.add(item.id);
                      else s.delete(item.id);
                      setSelectedDelete(s);
                    }}
                  />
                  <label htmlFor={`delete-${item.id}`}>
                    ID: {item.id} | {item.code} — {item.name} — Cant: {item.quantity} {item.unit}
                  </label>
                </div>
              ))}
            </div>
            <div className="delete-buttons" style={{ marginTop: 15 }}>
              <button type="button" className="confirm-delete-btn" onClick={confirmDelete}>
                Eliminar Seleccionados
              </button>
              <button type="button" className="cancel-delete-btn" onClick={toggleDeleteMode}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2>Inventario de Productos</h2>
            <div className="search-container">
              <input
                type="search"
                placeholder="Buscar Producto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select value={filterUb} onChange={(e) => setFilterUb(e.target.value)}>
                <option value="">Todas las ubicaciones</option>
                {ubicaciones.map((ub) => (
                  <option key={ub.id} value={ub.id}>
                    Pasillo {ub.pasillo} — Estante {ub.estante} — Sección {ub.seccion}
                  </option>
                ))}
              </select>
              <button type="button" className="accent-button" onClick={() => refresh()}>
                Filtrar
              </button>
            </div>
            {loading ? (
              <p>Cargando inventario…</p>
            ) : (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Ubicación</th>
                    <th>Cantidad</th>
                    <th>Mín.</th>
                    <th>Precio</th>
                    <th>Vencimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="no-products">
                        No hay productos en el inventario
                      </td>
                    </tr>
                  ) : (
                    products.map((item) => {
                      const qty = Number(item.quantity);
                      const minQty = Number(item.minQuantity ?? 0);
                      const isLowStock = !Number.isNaN(qty) && !Number.isNaN(minQty) && qty <= minQty;
                      const today = new Date();
                      let expirationClass = '';
                      let expirationStatus = '';
                      const notifyLead = Number(item.notifyDaysBefore ?? 30);
                      if (item.expirationDate) {
                        const exp = new Date(item.expirationDate);
                        const daysTo = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                        if (daysTo < 0) {
                          expirationStatus = 'Vencido';
                          expirationClass = 'expired';
                        } else if (daysTo <= notifyLead) {
                          expirationStatus = 'Próximo';
                          expirationClass = 'expiring';
                        }
                      }
                      const ubi = item.ubicacionDetalle
                        ? `P${item.ubicacionDetalle.pasillo}-E${item.ubicacionDetalle.estante}-S${item.ubicacionDetalle.seccion}`
                        : 'Sin ubicación';
                      return (
                        <tr
                          key={item.id}
                          className={`${isLowStock ? 'low-stock' : ''} ${expirationClass}`.trim()}
                        >
                          <td>{item.id}</td>
                          <td>{item.code || ''}</td>
                          <td>{item.name}</td>
                          <td>{item.category || ''}</td>
                          <td>{ubi}</td>
                          <td>
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td>{item.minQuantity || 0}</td>
                          <td>${(item.price || 0).toLocaleString()}</td>
                          <td className={expirationClass}>
                            {item.expirationDate
                              ? `${formatDate(item.expirationDate)}${expirationStatus ? ` (${expirationStatus})` : ''}`
                              : 'N/A'}
                          </td>
                          <td>
                            {canManageProducts ? (
                              <button type="button" className="edit-btn" onClick={() => openEdit(item.id)}>
                                Editar
                              </button>
                            ) : (
                              'Solo lectura'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
            {canManageProducts && deletionRows.length > 0 && (
              <div className="inventory-deletion-audit" style={{ marginTop: '1.5rem' }}>
                <h3>Historial de productos eliminados</h3>
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Cant. al eliminar</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletionRows.map((r) => (
                      <tr key={r.id ?? `${r.codigo}-${r.eliminado_en}`}>
                        <td>{r.eliminado_en ? String(r.eliminado_en).replace('T', ' ').slice(0, 19) : '—'}</td>
                        <td>{r.codigo || ''}</td>
                        <td>{r.nombre || ''}</td>
                        <td>{r.categoria || ''}</td>
                        <td>{r.cantidad_al_eliminar ?? ''}</td>
                        <td>{r.eliminado_por_nombre || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {productModal.open && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <button
              type="button"
              className="close-button"
              aria-label="Cerrar"
              onClick={() => setProductModal({ open: false, mode: 'add', editId: null })}
            >
              &times;
            </button>
            <h2>{productModal.mode === 'edit' ? 'Editar Producto' : 'Agregar Producto'}</h2>
            <form onSubmit={saveProduct}>
              <input
                value={productForm.code}
                onChange={(e) => setProductForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Código"
                required
              />
              <input
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del Producto"
                required
              />
              <input
                value={productForm.category}
                onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Categoría"
                required
              />
              <select
                value={productForm.ubicacionId}
                onChange={(e) => setProductForm((f) => ({ ...f, ubicacionId: e.target.value }))}
              >
                <option value="">Seleccione Ubicación (Opcional)</option>
                {ubicaciones.map((ub) => (
                  <option key={ub.id} value={ub.id}>
                    Pasillo {ub.pasillo} — Estante {ub.estante} — Sección {ub.seccion}
                  </option>
                ))}
              </select>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción"
                required
              />
              <input
                type="number"
                value={productForm.quantity}
                onChange={(e) => setProductForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="Cantidad"
                required
                min={0}
              />
              <input
                type="number"
                value={productForm.minQuantity}
                onChange={(e) => setProductForm((f) => ({ ...f, minQuantity: e.target.value }))}
                placeholder="Cantidad Mínima"
                required
                min={0}
              />
              <input
                type="number"
                value={productForm.price}
                onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Precio"
                required
                min={0}
              />
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm((f) => ({ ...f, unit: e.target.value }))}
                required
              >
                <option value="unidad">Unidad</option>
                <option value="metro">Metro</option>
                <option value="rollo">Rollo</option>
              </select>
              <div className="form-group">
                <label htmlFor="expDate">Fecha de Vencimiento:</label>
                <input
                  id="expDate"
                  type="date"
                  value={productForm.expirationDate}
                  onChange={(e) => setProductForm((f) => ({ ...f, expirationDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="notifyDays">Días de preaviso:</label>
                <input
                  id="notifyDays"
                  type="number"
                  min={1}
                  value={productForm.notifyDaysBefore}
                  onChange={(e) => setProductForm((f) => ({ ...f, notifyDaysBefore: e.target.value }))}
                />
              </div>
              <button type="submit">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {csvOpen && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <button type="button" className="close-button" onClick={() => setCsvOpen(false)}>
              &times;
            </button>
            <h2>Importar Datos</h2>
            <p>
              Excel (.xlsx, .xls) o CSV. Columnas: Código, Nombre, Categoría, Descripción, Cantidad, Precio, Unidad.
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}

      {updateOpen && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <button type="button" className="close-button" onClick={() => setUpdateOpen(false)}>
              &times;
            </button>
            <h2>Actualizar Inventario</h2>
            <form onSubmit={submitMovement}>
              <select
                required
                value={updateForm.productId}
                onChange={(e) => setUpdateForm((f) => ({ ...f, productId: e.target.value }))}
              >
                <option value="">Seleccionar Producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code || 'Sin código'}) — Stock: {p.quantity}
                  </option>
                ))}
              </select>
              <select
                required
                value={updateForm.type}
                onChange={(e) => setUpdateForm((f) => ({ ...f, type: e.target.value }))}
                disabled={canCreateMovements && !canManageMovements}
              >
                {canCreateMovements && !canManageMovements ? (
                  <option value="salida">Salida</option>
                ) : (
                  <>
                    <option value="">Tipo de Actualización</option>
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </>
                )}
              </select>
              <input
                type="number"
                required
                value={updateForm.quantity}
                onChange={(e) => setUpdateForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="Cantidad"
              />
              <textarea
                required
                value={updateForm.reason}
                onChange={(e) => setUpdateForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Motivo"
              />
              <button type="submit">Actualizar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
