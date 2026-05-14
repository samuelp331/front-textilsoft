export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * CSS del gráfico "Consumo por producto" para impresión / PDF.
 * Al clonar solo el outerHTML a una ventana nueva no se cargan legacy-styles.css,
 * sin esto las barras no tienen track ni colores.
 */
export const CONSUMPTION_AGGREGATE_CHART_PDF_CSS = `
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .consumption-aggregate-chart {
    height: auto;
    min-height: 0;
    margin-bottom: 1rem;
    padding: 1rem 1.25rem 1.15rem;
    background: linear-gradient(165deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%);
    border: 1px solid rgba(45, 55, 71, 0.12);
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  }
  .consumption-aggregate-chart .table-message {
    margin: 0;
    padding: 1.25rem;
    text-align: center;
    color: #64748b;
    background: rgba(248, 250, 252, 0.9);
    border-radius: 8px;
    border: 1px dashed #cbd5e1;
  }
  .consumption-chart-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .consumption-chart-title {
    margin: 0 0 0.35rem 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .consumption-chart-subtitle {
    margin: 0;
    font-size: 0.82rem;
    color: #64748b;
    line-height: 1.45;
    max-width: 52ch;
  }
  .consumption-bars-list {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .consumption-bar-row {
    display: grid;
    grid-template-columns: minmax(160px, 1.1fr) minmax(140px, 2fr) minmax(88px, auto);
    gap: 0.65rem 1rem;
    align-items: center;
  }
  .consumption-bar-meta {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }
  .consumption-bar-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(145deg, #e2e8f0, #f1f5f9);
    color: #475569;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .consumption-bar-rank--1 {
    background: linear-gradient(145deg, #fff7ed, #ffedd5);
    color: #9a3412;
    border: 1px solid rgba(234, 88, 12, 0.25);
  }
  .consumption-bar-name {
    font-size: 0.93rem;
    font-weight: 500;
    color: #334155;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .consumption-bar-track {
    position: relative;
    height: 24px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
  }
  .consumption-bar-fill {
    height: 100%;
    border-radius: 999px;
    min-width: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  .consumption-bar-fill--lead {
    background: linear-gradient(90deg, #c2410c 0%, #ea580c 50%, #fb923c 100%);
  }
  .consumption-bar-fill--mid {
    background: linear-gradient(90deg, #b45309 0%, #d97706 100%);
  }
  .consumption-bar-fill--rest {
    background: linear-gradient(90deg, #78716c 0%, #a8a29e 100%);
  }
  .consumption-bar-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
    text-align: right;
  }
  .consumption-bar-qty {
    font-size: 1.05rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .consumption-bar-unit {
    font-size: 0.72rem;
    font-weight: 600;
    color: #94a3b8;
    margin-left: 0.15rem;
  }
  .consumption-bar-pct {
    font-size: 0.72rem;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }
  .consumption-bar-share {
    font-size: 0.7rem;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }
`;

/** Gráfico de tendencia (SVG + tabla auxiliar) para la misma ventana de impresión. */
export const CONSUMPTION_TREND_CHART_PDF_CSS = `
  .consumption-trend-chart-host { margin: 0; padding: 0.75rem 0 0 0; }
  .consumption-trend-chart-host .table-message {
    margin: 0;
    padding: 1rem;
    text-align: center;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px dashed #cbd5e1;
  }
  .consumption-trend-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.95rem;
    color: #334155;
  }
  .consumption-trend-header .trend-code { font-family: ui-monospace, monospace; font-size: 0.85rem; color: #64748b; }
  .consumption-trend-header .trend-total { margin-left: auto; font-size: 0.9rem; color: #475569; }
  .consumption-trend-svg { width: 100%; height: 260px; display: block; max-width: 100%; }
  .consumption-trend-table-wrap { margin-top: 0.65rem; overflow-x: auto; }
  .consumption-trend-table { width: 100%; font-size: 0.82rem; border-collapse: collapse; color: #475569; }
  .consumption-trend-table th,
  .consumption-trend-table td { border: 1px solid #e2e8f0; padding: 0.35rem 0.5rem; text-align: left; }
  .consumption-trend-table th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .consumption-trend-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
`;

export function downloadExcelHtmlTable(reportTitle, headers, rows, filename) {
  const th = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const trs = rows
    .map((row) => {
      const tds = headers
        .map((_, col) => `<td>${escapeHtml(row[col] != null ? row[col] : '')}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  const gen = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(reportTitle)}</title>
<style>
table { border-collapse: collapse; }
th, td { border: 1px solid #333; padding: 6px 10px; }
th { background: #2d3747; color: #fff; font-weight: bold; }
</style>
</head>
<body>
<h1>${escapeHtml(reportTitle)}</h1>
<p style="font-size:12px;color:#666">Generado: ${escapeHtml(gen)}</p>
<table>
<thead><tr>${th}</tr></thead>
<tbody>${trs}</tbody>
</table>
</body>
</html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function printTableAsPdf(title, tableElement) {
  if (!tableElement) return;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
        <html>
        <head>
            <title>${escapeHtml(title)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 16px; }
                h1 { font-size: 18px; margin-bottom: 16px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #2d3747; color: #fff; }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(title)}</h1>
            ${tableElement.outerHTML}
        </body>
        </html>
    `);
  w.document.close();
  w.focus();
  w.print();
}
