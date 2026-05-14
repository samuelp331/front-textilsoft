import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '../components/AppHeader.jsx';
import { api } from '../lib/api.js';
import * as inventoryData from '../lib/inventoryData.js';
import {
  CONSUMPTION_AGGREGATE_CHART_PDF_CSS,
  CONSUMPTION_TREND_CHART_PDF_CSS,
  downloadExcelHtmlTable,
  escapeHtml,
} from '../lib/reportExport.js';
import { notify } from '../lib/notify.js';

function consumptionBarFillClass(rankIndex) {
  if (rankIndex === 0) return 'consumption-bar-fill consumption-bar-fill--lead';
  if (rankIndex === 1) return 'consumption-bar-fill consumption-bar-fill--mid';
  return 'consumption-bar-fill consumption-bar-fill--rest';
}

function ConsumptionBars({ data }) {
  if (!data?.length) {
    return <p className="table-message">Sin datos de consumo.</p>;
  }
  const max = Math.max(...data.map((i) => Number(i.cantidad) || 0), 1);
  const sorted = [...data].sort((a, b) => (Number(b.cantidad) || 0) - (Number(a.cantidad) || 0));
  return (
    <div className="consumption-aggregate-chart">
      <div className="consumption-chart-header">
        <h3 className="consumption-chart-title">Consumo por producto</h3>
        <p className="consumption-chart-subtitle">
          Parte proporcional respecto al producto con mayor consumo en este reporte.
        </p>
      </div>
      <div className="consumption-bars-list">
        {sorted.map((item, index) => {
          const qty = Number(item.cantidad) || 0;
          const vsMaxPct = max > 0 ? Math.round((qty / max) * 100) : 0;
          const widthPct = Math.max(vsMaxPct, qty > 0 ? 3 : 0);
          return (
            <div key={item.producto_id ?? `${item.producto_nombre}-${index}`} className="consumption-bar-row">
              <div className="consumption-bar-meta">
                <span
                  className={`consumption-bar-rank${index === 0 ? ' consumption-bar-rank--1' : ''}`}
                >
                  {index + 1}
                </span>
                <span className="consumption-bar-name" title={item.producto_nombre}>
                  {item.producto_nombre || '—'}
                </span>
              </div>
              <div className="consumption-bar-track">
                <div className={consumptionBarFillClass(index)} style={{ width: `${widthPct}%` }} />
              </div>
              <div className="consumption-bar-stats">
                <div className="consumption-bar-qty">
                  {String(qty)}
                  <span className="consumption-bar-unit">u.</span>
                </div>
                {item.porcentaje != null && Number.isFinite(Number(item.porcentaje)) && (
                  <span className="consumption-bar-pct">{Number(item.porcentaje).toFixed(1)}% del total</span>
                )}
                <span className="consumption-bar-share">{vsMaxPct}% vs. mayor</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function escapeTrendHtml(text) {
  return escapeHtml(text);
}

function formatTrendPeriodLabel(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric', day: 'numeric' });
}

function computeYAxisMax(maxVal) {
  if (maxVal <= 0) return 1;
  const padded = Math.max(maxVal * 1.12, maxVal + 1);
  const step = padded <= 10 ? 2 : padded <= 50 ? 5 : 10;
  return Math.max(step, Math.ceil(padded / step) * step);
}

function TrendChart({ payload }) {
  const serie = payload?.serie || [];
  if (!serie.length) {
    return <p className="table-message">No hay salidas registradas en el rango para este producto.</p>;
  }
  const maxVal = Math.max(...serie.map((s) => Number(s.cantidad) || 0), 0);
  const yMax = computeYAxisMax(maxVal);
  const n = serie.length;
  const W = 720;
  const H = 252;
  const pl = 44;
  const pr = 14;
  const pt = 6;
  const pb = 46;
  const pw = W - pl - pr;
  const ph = H - pt - pb;
  const xAt = (i) => (n <= 1 ? pl + pw / 2 : pl + (pw * i) / (n - 1));
  const yAt = (v) => pt + ph - (Math.min(Math.max(v, 0), yMax) / yMax) * ph;
  const ptsStr = serie.map((s, i) => `${xAt(i)},${yAt(Number(s.cantidad) || 0)}`).join(' ');
  const labelSkip = n > 14 ? 3 : n > 8 ? 2 : 1;

  return (
    <div className="consumption-trend-chart-host">
      <div className="consumption-trend-header">
        <strong>{escapeTrendHtml(payload.producto_nombre)}</strong>{' '}
        <span className="trend-code">{escapeTrendHtml(payload.producto_codigo || '')}</span>{' '}
        <span className="trend-total">
          Total periodo: <strong>{escapeTrendHtml(String(payload.total_salidas_periodo))}</strong> u.
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="consumption-trend-svg" preserveAspectRatio="xMidYMid meet">
        <rect x={pl} y={pt} width={pw} height={ph} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        {[0, 1, 2, 3, 4].map((g) => {
          const val = (yMax * (4 - g)) / 4;
          const y = pt + (ph * g) / 4;
          return (
            <g key={g}>
              <line
                x1={pl}
                x2={pl + pw}
                y1={y}
                y2={y}
                stroke={g === 4 ? '#94a3b8' : '#e2e8f0'}
                strokeWidth={g === 4 ? 1.25 : 1}
              />
              <text x={pl - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                {Number.isInteger(val) ? String(val) : val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {n > 1 && (
          <polyline
            fill="none"
            stroke="#2a6f97"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={ptsStr}
          />
        )}
        {serie.map((s, i) => {
          const x = xAt(i);
          const y = yAt(Number(s.cantidad) || 0);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={n === 1 ? 7 : 5}
                fill="#cc6a06"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={x}
                y={Math.max(y - 14, pt + 2)}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="12"
                fontWeight="600"
              >
                {String(s.cantidad)}
              </text>
            </g>
          );
        })}
        {serie.map((s, i) => {
          if (i % labelSkip !== 0 && i !== n - 1) return null;
          return (
            <text
              key={`l-${i}`}
              x={xAt(i)}
              y={H - 18}
              textAnchor="middle"
              fill="#475569"
              fontSize="10"
            >
              {formatTrendPeriodLabel(s.periodo)}
            </text>
          );
        })}
        <text x={pl + 2} y={pt + 12} fill="#64748b" fontSize="10">
          Salidas (unidades)
        </text>
        <text x={pl + pw / 2} y={H - 4} textAnchor="middle" fill="#64748b" fontSize="11">
          Periodo
        </text>
      </svg>
      <div className="consumption-trend-table-wrap">
        <table className="consumption-trend-table">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Salidas</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((s) => (
              <tr key={s.periodo}>
                <td>{formatTrendPeriodLabel(s.periodo)}</td>
                <td>{String(s.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConsumptionReportPage() {
  const [category, setCategory] = useState('');
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [trendProduct, setTrendProduct] = useState('');
  const [trendGroup, setTrendGroup] = useState('mes');
  const [trendStart, setTrendStart] = useState('');
  const [trendEnd, setTrendEnd] = useState('');
  const [trendPayload, setTrendPayload] = useState(null);
  const chartRef = useRef(null);
  const tableRef = useRef(null);
  const trendRef = useRef(null);

  const reloadConsumo = useCallback(async (categoria) => {
    const query = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    try {
      const rows = await api.get(`/reports/consumo${query}`);
      setData(Array.isArray(rows) ? rows : []);
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  }, []);

  const loadTrend = async () => {
    if (!trendProduct) {
      setTrendPayload(null);
      return;
    }
    const params = new URLSearchParams({ producto_id: trendProduct, agrupar: trendGroup });
    if (trendStart) params.set('fecha_desde', trendStart);
    if (trendEnd) params.set('fecha_hasta', trendEnd);
    try {
      const payload = await api.get(`/reports/consumo-serie?${params}`);
      setTrendPayload(payload);
    } catch (e) {
      notify.toast(e.message, 'error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await inventoryData.loadProducts();
      if (cancelled) return;
      setProducts(inventoryData.getProducts());
      try {
        const cats = await inventoryData.getCategorias();
        if (!cancelled) setCategoryList(Array.isArray(cats) ? cats : []);
      } catch {
        if (!cancelled) setCategoryList([]);
      }
      await reloadConsumo('');
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadConsumo]);

  const exportExcel = () => {
    const rows = data.map((item) => [item.producto_nombre, item.cantidad, `${item.porcentaje}%`]);
    downloadExcelHtmlTable(
      'Reporte — Consumo de materiales',
      ['Producto', 'Cantidad', 'Porcentaje'],
      rows,
      `Reporte_Consumo_${new Date().toISOString().split('T')[0]}.xls`,
    );
  };

  const exportPdf = () => {
    const chartEl = chartRef.current;
    const tableEl = tableRef.current;
    const trendEl = trendRef.current;
    if (!tableEl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const catLabel = category || 'Todas las categorias';
    const gen = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const chartBlock =
      chartEl && chartEl.innerHTML.trim() ? chartEl.outerHTML : '<p>Sin gráfico.</p>';
    const trendBlock =
      trendEl && trendEl.innerHTML.trim()
        ? `<h2>Tendencia (salidas)</h2><div>${trendEl.innerHTML}</div>`
        : '';
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Consumo</title>
    <style>
    body{font-family:Arial,sans-serif;padding:16px;color:#0f172a;}
    h1{font-size:1.35rem;} h2{font-size:1.05rem;margin-top:1.25rem;}
    table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;} th{background:#2d3747;color:#fff;}
    ${CONSUMPTION_AGGREGATE_CHART_PDF_CSS}
    ${CONSUMPTION_TREND_CHART_PDF_CSS}
    </style></head><body>
    <h1>Reporte de consumo de materiales</h1>
    <p>Categoría: ${escapeHtml(catLabel)} · Generado: ${escapeHtml(gen)}</p>
    <h2>Gráfico</h2><div>${chartBlock}</div>
    <h2>Tabla</h2>${tableEl.outerHTML}
    ${trendBlock}
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="app-screen" id="consumptionReportPage">
      <AppHeader />
      <div className="ts-page-title-block">
        <h1>
          <i className="fa-solid fa-chart-line" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
          Consumo de materiales
        </h1>
        <p>Distribución por producto, tabla de participación y tendencia de salidas.</p>
      </div>
      <div className="report-content ts-page-panel">
        <div className="filter-controls">
          <div className="filter-control">
            <label htmlFor="consumptionCategorySelect">Categoría:</label>
            <select
              id="consumptionCategorySelect"
              className="light-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas las categorias</option>
              {categoryList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="accent-button" onClick={() => void reloadConsumo(category)}>
            Aplicar
          </button>
        </div>
        <div id="consumptionChart" ref={chartRef}>
          <ConsumptionBars data={data} />
        </div>
        <div className="table-container">
          <table id="consumptionTable" ref={tableRef} className="report-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {!data.length ? (
                <tr>
                  <td colSpan={3} className="table-message">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.producto_nombre}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.porcentaje}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="report-actions">
          <button type="button" className="primary-button" onClick={exportPdf}>
            Exportar PDF
          </button>
          <button type="button" className="primary-button" onClick={exportExcel}>
            Exportar Excel
          </button>
        </div>

        <h3 style={{ marginTop: '2rem' }}>Tendencia de consumo (salidas)</h3>
        <div className="filter-controls">
          <select
            className="light-select"
            value={trendProduct}
            onChange={(e) => setTrendProduct(e.target.value)}
          >
            <option value="">Seleccione un producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code || 'Sin codigo'})
              </option>
            ))}
          </select>
          <select className="light-select" value={trendGroup} onChange={(e) => setTrendGroup(e.target.value)}>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
          <input type="date" className="light-input" value={trendStart} onChange={(e) => setTrendStart(e.target.value)} />
          <input type="date" className="light-input" value={trendEnd} onChange={(e) => setTrendEnd(e.target.value)} />
          <button type="button" className="accent-button" onClick={() => loadTrend()}>
            Actualizar tendencia
          </button>
        </div>
        <div id="consumptionTrendChart" ref={trendRef}>
          {trendPayload ? <TrendChart payload={trendPayload} /> : null}
        </div>
      </div>
    </div>
  );
}
