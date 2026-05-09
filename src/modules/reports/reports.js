let inventoryMovements = [];
let consumptionData = [];
let consumptionTrendPayload = null;

function showReport(reportType) {
    if (typeof navigation === 'undefined' || typeof navigation.showPage !== 'function') return;
    const pageId =
        reportType === 'inventory-movements'
            ? 'inventoryMovementsPage'
            : reportType === 'consumption'
              ? 'consumptionReportPage'
              : null;
    if (!pageId) return;
    if (typeof auth !== 'undefined' && typeof auth.hasPageAccess === 'function' && !auth.hasPageAccess(pageId)) {
        alert('No tienes permisos para ver este reporte.');
        return;
    }
    navigation.showPage(pageId);
}

function initReportCards() {
    const inventoryMovementsCard = document.getElementById('inventoryMovementsCard');
    if (inventoryMovementsCard) {
        inventoryMovementsCard.addEventListener('click', () => showReport('inventory-movements'));
    }

    const consumptionReportsCard = document.getElementById('consumptionReportsCard');
    if (consumptionReportsCard) {
        consumptionReportsCard.addEventListener('click', () => showReport('consumption'));
    }
}

async function loadProductsForFilter(selectElement) {
    if (!selectElement) return;
    await inventoryData.loadProducts();
    const products = inventoryData.getProducts();
    selectElement.innerHTML = '<option value="">Todos</option>';
    products.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.code || 'Sin codigo'})`;
        selectElement.appendChild(opt);
    });
}

function renderInventoryMovementsTable(data) {
    const tbody = document.querySelector('#movementsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-message">Sin resultados.</td></tr>';
        return;
    }

    data.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.fecha || row.date || ''}</td>
            <td>${row.producto_nombre || row.productName || ''}</td>
            <td>${row.cantidad ?? row.quantity ?? 0}</td>
            <td>${row.motivo || row.reason || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadInventoryMovementsData() {
    const start = document.getElementById('movementStartDate')?.value;
    const end = document.getElementById('movementEndDate')?.value;
    const productId = document.getElementById('movementProductSelect')?.value;
    const type = document.getElementById('movementTypeSelect')?.value;

    const params = new URLSearchParams();
    if (start) params.set('fecha_desde', start);
    if (end) params.set('fecha_hasta', end);
    if (productId) params.set('producto_id', productId);
    if (type) params.set('tipo', type);
    const query = params.toString() ? `?${params.toString()}` : '';

    inventoryMovements = await apiClient.get(`/reports/movimientos${query}`);
    renderInventoryMovementsTable(inventoryMovements);
}

async function loadProductsForTrendSelect(selectElement) {
    if (!selectElement) return;
    await inventoryData.loadProducts();
    const products = inventoryData.getProducts();
    const cur = selectElement.value;
    selectElement.innerHTML = '<option value="">Seleccione un producto</option>';
    products.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.code || 'Sin codigo'})`;
        selectElement.appendChild(opt);
    });
    if (cur) selectElement.value = cur;
}

async function loadConsumptionTrend() {
    const pid = document.getElementById('consumptionTrendProductSelect')?.value;
    const chart = document.getElementById('consumptionTrendChart');
    if (!pid) {
        if (chart) {
            chart.className = 'consumption-trend-chart-host';
            chart.innerHTML =
                '<p class="table-message">Seleccione un producto y pulse Actualizar tendencia.</p>';
        }
        return;
    }
    const agrupar = document.getElementById('consumptionTrendGroupSelect')?.value || 'mes';
    const desde = document.getElementById('consumptionTrendStart')?.value;
    const hasta = document.getElementById('consumptionTrendEnd')?.value;
    const params = new URLSearchParams({ producto_id: pid, agrupar });
    if (desde) params.set('fecha_desde', desde);
    if (hasta) params.set('fecha_hasta', hasta);
    consumptionTrendPayload = await apiClient.get(`/reports/consumo-serie?${params.toString()}`);
    renderConsumptionTrendChart(consumptionTrendPayload);
}

function escapeTrendHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
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

function renderConsumptionTrendChart(payload) {
    const NS = 'http://www.w3.org/2000/svg';
    const chart = document.getElementById('consumptionTrendChart');
    if (!chart) return;
    const serie = payload.serie || [];
    chart.innerHTML = '';
    chart.className = 'consumption-trend-chart-host';

    if (!serie.length) {
        chart.innerHTML =
            '<p class="table-message">No hay salidas registradas en el rango para este producto.</p>';
        return;
    }

    const header = document.createElement('div');
    header.className = 'consumption-trend-header';
    header.innerHTML = `<strong>${escapeTrendHtml(payload.producto_nombre)}</strong> `
        + `<span class="trend-code">${escapeTrendHtml(payload.producto_codigo || '')}</span>`
        + `<span class="trend-total">Total periodo: <strong>${escapeTrendHtml(String(payload.total_salidas_periodo))}</strong> u.</span>`;
    chart.appendChild(header);

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

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'consumption-trend-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const plotBg = document.createElementNS(NS, 'rect');
    plotBg.setAttribute('x', String(pl));
    plotBg.setAttribute('y', String(pt));
    plotBg.setAttribute('width', String(pw));
    plotBg.setAttribute('height', String(ph));
    plotBg.setAttribute('fill', '#f8fafc');
    plotBg.setAttribute('stroke', '#e2e8f0');
    plotBg.setAttribute('stroke-width', '1');
    svg.appendChild(plotBg);

    const gridN = 4;
    for (let g = 0; g <= gridN; g += 1) {
        const val = (yMax * (gridN - g)) / gridN;
        const y = pt + (ph * g) / gridN;
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', String(pl));
        line.setAttribute('x2', String(pl + pw));
        line.setAttribute('y1', String(y));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', g === gridN ? '#94a3b8' : '#e2e8f0');
        line.setAttribute('stroke-width', g === gridN ? '1.25' : '1');
        svg.appendChild(line);

        const lbl = document.createElementNS(NS, 'text');
        lbl.setAttribute('x', String(pl - 6));
        lbl.setAttribute('y', String(y + 4));
        lbl.setAttribute('text-anchor', 'end');
        lbl.setAttribute('fill', '#64748b');
        lbl.setAttribute('font-size', '11');
        lbl.textContent = Number.isInteger(val) ? String(val) : val.toFixed(1);
        svg.appendChild(lbl);
    }

    if (n > 1) {
        const ptsStr = serie
            .map((s, i) => `${xAt(i)},${yAt(Number(s.cantidad) || 0)}`)
            .join(' ');
        const poly = document.createElementNS(NS, 'polyline');
        poly.setAttribute('fill', 'none');
        poly.setAttribute('stroke', '#2a6f97');
        poly.setAttribute('stroke-width', '2.5');
        poly.setAttribute('stroke-linejoin', 'round');
        poly.setAttribute('stroke-linecap', 'round');
        poly.setAttribute('points', ptsStr);
        svg.appendChild(poly);
    }

    serie.forEach((s, i) => {
        const x = xAt(i);
        const y = yAt(Number(s.cantidad) || 0);
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', String(x));
        c.setAttribute('cy', String(y));
        c.setAttribute('r', n === 1 ? '7' : '5');
        c.setAttribute('fill', '#cc6a06');
        c.setAttribute('stroke', '#fff');
        c.setAttribute('stroke-width', '2');
        svg.appendChild(c);

        const val = document.createElementNS(NS, 'text');
        val.setAttribute('x', String(x));
        val.setAttribute('y', String(Math.max(y - 14, pt + 2)));
        val.setAttribute('text-anchor', 'middle');
        val.setAttribute('fill', '#0f172a');
        val.setAttribute('font-size', '12');
        val.setAttribute('font-weight', '600');
        val.textContent = String(s.cantidad);
        svg.appendChild(val);
    });

    const labelSkip = n > 14 ? 3 : n > 8 ? 2 : 1;
    serie.forEach((s, i) => {
        if (i % labelSkip !== 0 && i !== n - 1) return;
        const tx = document.createElementNS(NS, 'text');
        tx.setAttribute('x', String(xAt(i)));
        tx.setAttribute('y', String(H - 18));
        tx.setAttribute('text-anchor', 'middle');
        tx.setAttribute('fill', '#475569');
        tx.setAttribute('font-size', '10');
        tx.textContent = formatTrendPeriodLabel(s.periodo);
        svg.appendChild(tx);
    });

    const xAxisTitle = document.createElementNS(NS, 'text');
    xAxisTitle.setAttribute('x', String(pl + pw / 2));
    xAxisTitle.setAttribute('y', String(H - 4));
    xAxisTitle.setAttribute('text-anchor', 'middle');
    xAxisTitle.setAttribute('fill', '#64748b');
    xAxisTitle.setAttribute('font-size', '11');
    xAxisTitle.textContent = 'Periodo';
    svg.appendChild(xAxisTitle);

    const yNote = document.createElementNS(NS, 'text');
    yNote.setAttribute('x', String(pl + 2));
    yNote.setAttribute('y', String(pt + 12));
    yNote.setAttribute('fill', '#64748b');
    yNote.setAttribute('font-size', '10');
    yNote.textContent = 'Salidas (unidades)';
    svg.appendChild(yNote);

    chart.appendChild(svg);

    const tw = document.createElement('div');
    tw.className = 'consumption-trend-table-wrap';
    const tbl = document.createElement('table');
    tbl.className = 'consumption-trend-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Periodo</th><th>Salidas</th></tr>';
    tbl.appendChild(thead);
    const tb = document.createElement('tbody');
    serie.forEach((s) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = formatTrendPeriodLabel(s.periodo);
        const td2 = document.createElement('td');
        td2.textContent = String(s.cantidad);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    tw.appendChild(tbl);
    chart.appendChild(tw);
}

function consumptionBarFillClass(rankIndex) {
    if (rankIndex === 0) return 'consumption-bar-fill consumption-bar-fill--lead';
    if (rankIndex === 1) return 'consumption-bar-fill consumption-bar-fill--mid';
    return 'consumption-bar-fill consumption-bar-fill--rest';
}

function renderConsumptionChart(data) {
    const chart = document.getElementById('consumptionChart');
    if (!chart) return;
    chart.innerHTML = '';
    chart.className = 'consumption-aggregate-chart';

    if (!data.length) {
        chart.innerHTML = '<p class="table-message">Sin datos de consumo.</p>';
        return;
    }

    const max = Math.max(...data.map((i) => Number(i.cantidad) || 0), 1);
    const sorted = [...data].sort((a, b) => (Number(b.cantidad) || 0) - (Number(a.cantidad) || 0));

    const header = document.createElement('div');
    header.className = 'consumption-chart-header';
    const hTitle = document.createElement('h3');
    hTitle.className = 'consumption-chart-title';
    hTitle.textContent = 'Consumo por producto';
    const hSub = document.createElement('p');
    hSub.className = 'consumption-chart-subtitle';
    hSub.textContent =
        'Parte proporcional respecto al producto con mayor consumo en este reporte. El porcentaje es la participación sobre el total filtrado.';
    header.append(hTitle, hSub);
    chart.appendChild(header);

    const list = document.createElement('div');
    list.className = 'consumption-bars-list';

    sorted.forEach((item, index) => {
        const qty = Number(item.cantidad) || 0;
        const vsMaxPct = max > 0 ? Math.round((qty / max) * 100) : 0;
        const widthPct = Math.max(vsMaxPct, qty > 0 ? 3 : 0);

        const row = document.createElement('div');
        row.className = 'consumption-bar-row';

        const meta = document.createElement('div');
        meta.className = 'consumption-bar-meta';

        const rank = document.createElement('span');
        rank.className = `consumption-bar-rank${index === 0 ? ' consumption-bar-rank--1' : ''}`;
        rank.textContent = String(index + 1);

        const name = document.createElement('span');
        name.className = 'consumption-bar-name';
        name.textContent = item.producto_nombre || '—';
        name.title = item.producto_nombre || '';

        meta.append(rank, name);

        const track = document.createElement('div');
        track.className = 'consumption-bar-track';
        track.setAttribute('role', 'presentation');

        const fill = document.createElement('div');
        fill.className = consumptionBarFillClass(index);
        fill.style.width = `${widthPct}%`;
        track.appendChild(fill);

        const stats = document.createElement('div');
        stats.className = 'consumption-bar-stats';

        const qtyLine = document.createElement('div');
        qtyLine.className = 'consumption-bar-qty';
        qtyLine.append(document.createTextNode(String(qty)));
        const unit = document.createElement('span');
        unit.className = 'consumption-bar-unit';
        unit.textContent = 'u.';
        qtyLine.appendChild(unit);
        stats.appendChild(qtyLine);

        const pctReport = item.porcentaje;
        if (pctReport != null && pctReport !== '' && Number.isFinite(Number(pctReport))) {
            const p = document.createElement('span');
            p.className = 'consumption-bar-pct';
            p.textContent = `${Number(pctReport).toFixed(1)}% del total`;
            stats.appendChild(p);
        }

        const share = document.createElement('span');
        share.className = 'consumption-bar-share';
        share.textContent = `${vsMaxPct}% vs. mayor`;
        stats.appendChild(share);

        row.append(meta, track, stats);
        list.appendChild(row);
    });

    chart.appendChild(list);
}

function renderConsumptionTable(data) {
    const tbody = document.querySelector('#consumptionTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="table-message">Sin resultados.</td></tr>';
        return;
    }
    data.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.producto_nombre}</td>
            <td>${item.cantidad}</td>
            <td>${item.porcentaje}%</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadConsumptionData() {
    const category = document.getElementById('consumptionCategorySelect')?.value || '';
    const query = category ? `?categoria=${encodeURIComponent(category)}` : '';
    consumptionData = await apiClient.get(`/reports/consumo${query}`);
    renderConsumptionChart(consumptionData);
    renderConsumptionTable(consumptionData);
}

function loadCategoriesForFilter(selectElement) {
    if (!selectElement) return;
    const categories = [...new Set(consumptionData.map((i) => i.categoria).filter(Boolean))];
    selectElement.innerHTML = '<option value="">Todas las categorias</option>';
    categories.forEach((c) => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        selectElement.appendChild(option);
    });
}

async function applyInventoryMovementsFilters() {
    await loadInventoryMovementsData();
}

async function applyConsumptionFilters() {
    await loadConsumptionData();
}

function exportInventoryMovementsToExcel() {
    const rows = inventoryMovements.map((row) => [
        row.fecha || row.date || '',
        row.producto_nombre || row.productName || '',
        row.cantidad ?? row.quantity ?? 0,
        row.motivo || row.reason || '',
    ]);
    downloadCsv(
        ['Fecha', 'Producto', 'Cantidad', 'Motivo'],
        rows,
        `Movimientos_Inventario_${new Date().toISOString().split('T')[0]}.csv`,
    );
}

function exportInventoryMovementsToPdf() {
    printTableAsPdf('Reporte de Movimientos de Inventario', 'movementsTable');
}

function exportConsumptionToExcel() {
    const rows = consumptionData.map((item) => [
        item.producto_nombre,
        item.cantidad,
        `${item.porcentaje}%`,
    ]);
    downloadCsv(
        ['Producto', 'Cantidad', 'Porcentaje'],
        rows,
        `Reporte_Consumo_${new Date().toISOString().split('T')[0]}.csv`,
    );
}

function exportConsumptionToPdf() {
    printTableAsPdf('Reporte de Consumo', 'consumptionTable');
}

function escapeCsvValue(value) {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function downloadCsv(headers, rows, filename) {
    const csvRows = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printTableAsPdf(title, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 16px; }
                h1 { font-size: 18px; margin-bottom: 16px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #2d3747; color: #fff; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${table.outerHTML}
        </body>
        </html>
    `);
    w.document.close();
    w.focus();
    w.print();
}

function initInventoryMovementsPage() {
    const page = document.getElementById('inventoryMovementsPage');
    if (!page) return;
    const observer = new MutationObserver(async () => {
        if (!page.classList.contains('active')) return;
        await loadProductsForFilter(document.getElementById('movementProductSelect'));
        await loadInventoryMovementsData();
    });
    observer.observe(page, { attributes: true });
}

function initConsumptionReportPage() {
    const page = document.getElementById('consumptionReportPage');
    if (!page) return;
    const observer = new MutationObserver(async () => {
        if (!page.classList.contains('active')) return;
        await loadProductsForTrendSelect(document.getElementById('consumptionTrendProductSelect'));
        await loadConsumptionData();
        loadCategoriesForFilter(document.getElementById('consumptionCategorySelect'));
    });
    observer.observe(page, { attributes: true });
}

function initConsumptionTrendReport() {
    const btn = document.getElementById('applyConsumptionTrendBtn');
    if (btn) {
        btn.onclick = () => loadConsumptionTrend().catch((e) => alert(e.message));
    }
}

function initInventoryMovementsReport() {
    const apply = document.getElementById('applyMovementFiltersBtn');
    const excel = document.getElementById('exportMovementsExcelBtn');
    const pdf = document.getElementById('exportMovementsPdfBtn');
    if (apply) apply.onclick = applyInventoryMovementsFilters;
    if (excel) excel.onclick = exportInventoryMovementsToExcel;
    if (pdf) pdf.onclick = exportInventoryMovementsToPdf;
}

function initConsumptionReport() {
    const apply = document.getElementById('applyConsumptionFiltersBtn');
    const excel = document.getElementById('exportConsumptionExcelBtn');
    const pdf = document.getElementById('exportConsumptionPdfBtn');
    if (apply) apply.onclick = applyConsumptionFilters;
    if (excel) excel.onclick = exportConsumptionToExcel;
    if (pdf) pdf.onclick = exportConsumptionToPdf;
}

function initReports() {
    initReportCards();
    initInventoryMovementsPage();
    initConsumptionReportPage();
    initInventoryMovementsReport();
    initConsumptionReport();
    initConsumptionTrendReport();
}

window.initReports = initReports;
