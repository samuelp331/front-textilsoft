import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '../components/AppHeader.jsx';
import { api } from '../lib/api.js';
import * as inventoryData from '../lib/inventoryData.js';
import { downloadExcelHtmlTable, printTableAsPdf } from '../lib/reportExport.js';
import { notify } from '../lib/notify.js';

export function MovementsReportPage() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const tableRef = useRef(null);

  const loadProducts = async () => {
    await inventoryData.loadProducts();
    setProducts(inventoryData.getProducts());
  };

  const load = async () => {
    const params = new URLSearchParams();
    if (start) params.set('fecha_desde', start);
    if (end) params.set('fecha_hasta', end);
    if (productId) params.set('producto_id', productId);
    if (type) params.set('tipo', type);
    const q = params.toString() ? `?${params}` : '';
    try {
      const data = await api.get(`/reports/movimientos${q}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  };

  useEffect(() => {
    loadProducts().then(load);
  }, []);

  const exportExcel = () => {
    const r = rows.map((row) => [
      row.fecha || row.date || '',
      row.producto_nombre || row.productName || '',
      row.cantidad ?? row.quantity ?? 0,
      row.motivo || row.reason || '',
    ]);
    downloadExcelHtmlTable(
      'Reporte — Movimientos de inventario',
      ['Fecha', 'Producto', 'Cantidad', 'Motivo'],
      r,
      `Movimientos_Inventario_${new Date().toISOString().split('T')[0]}.xls`,
    );
  };

  const exportPdf = () => {
    if (tableRef.current) printTableAsPdf('Reporte de Movimientos de Inventario', tableRef.current);
  };

  return (
    <div className="app-screen" id="inventoryMovementsPage">
      <AppHeader />
      <div className="ts-page-title-block">
        <h1>
          <i className="fa-solid fa-arrow-right-arrow-left" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
          Movimientos de inventario
        </h1>
        <p>Filtrá por fechas, producto y tipo de movimiento. Exportá a Excel o PDF.</p>
      </div>
      <div className="report-content ts-page-panel">
        <div className="filter-controls">
          <div className="filter-control">
            <label htmlFor="movementStartDate">Desde:</label>
            <input
              id="movementStartDate"
              type="date"
              className="light-input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="filter-control">
            <label htmlFor="movementEndDate">Hasta:</label>
            <input
              id="movementEndDate"
              type="date"
              className="light-input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="filter-control">
            <label htmlFor="movementProductSelect">Producto:</label>
            <select
              id="movementProductSelect"
              className="light-select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Todos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code || 'Sin codigo'})
                </option>
              ))}
            </select>
          </div>
          <div className="filter-control">
            <label htmlFor="movementTypeSelect">Tipo:</label>
            <select
              id="movementTypeSelect"
              className="light-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div className="filter-control">
            <button type="button" className="accent-button" onClick={() => load()}>
              Aplicar Filtros
            </button>
          </div>
        </div>
        <div className="table-container">
          <table ref={tableRef} id="movementsTable" className="report-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan={4} className="table-message">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.id ?? i}>
                    <td>{row.fecha || row.date || ''}</td>
                    <td>{row.producto_nombre || row.productName || ''}</td>
                    <td>{row.cantidad ?? row.quantity ?? 0}</td>
                    <td>{row.motivo || row.reason || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="report-actions">
          <button type="button" className="primary-button" onClick={exportPdf}>
            <i className="fas fa-file-pdf" /> Exportar PDF
          </button>
          <button type="button" className="primary-button" onClick={exportExcel}>
            Exportar Excel
          </button>
        </div>
      </div>
    </div>
  );
}
