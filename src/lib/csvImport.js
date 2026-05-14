import * as XLSX from 'xlsx';
import { inventoryData } from './inventoryData.js';
import { notify } from './notify.js';

function normalizeHeaderKey(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result.map((c) => c.replace(/^"|"$/g, ''));
}

function parseCsvTextToMatrix(text) {
  const lines = text.split(/\r?\n/).filter((row) => row.trim() !== '');
  return lines.map(parseCsvLine);
}

function parseNumericCell(raw, asInt) {
  const t = String(raw == null ? '' : raw).trim().replace(/\s/g, '');
  if (!t) return NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return asInt ? parseInt(normalized, 10) : parseFloat(normalized);
}

async function processImportMatrix(matrixRows, onDone) {
  let added = 0;
  let processed = 0;

  if (!matrixRows.length) {
    notify.toast('El archivo no contiene datos.', 'warning');
    onDone?.();
    return;
  }

  const headerCells = matrixRows[0].map((h) => normalizeHeaderKey(h));
  const required = ['codigo', 'nombre', 'categoria', 'descripcion', 'cantidad', 'precio', 'unidad'];
  const hasHeader = required.some((r) => headerCells.includes(r));
  const dataRows = hasHeader ? matrixRows.slice(1) : matrixRows;

  for (const cols of dataRows) {
    const strCols = cols.map((c) => (c == null ? '' : String(c)).trim());
    while (strCols.length < 7) strCols.push('');
    const seven = strCols.slice(0, 7);

    if (seven.every((c) => c === '')) continue;

    const categoryRaw = seven[2];
    const category = categoryRaw ? categoryRaw.replace(/\s+/g, ' ').trim() : '';

    const product = {
      code: seven[0],
      name: seven[1],
      category,
      description: seven[3],
      quantity: parseNumericCell(seven[4], true),
      price: parseNumericCell(seven[5], false),
      unit: String(seven[6]).toLowerCase(),
    };

    if (!product.code || !product.name || !product.category) continue;
    if (Number.isNaN(product.quantity) || product.quantity < 0) continue;
    if (Number.isNaN(product.price) || product.price < 0) continue;
    if (!['unidad', 'metro', 'rollo'].includes(product.unit)) continue;

    const created = await inventoryData.addProduct(product);
    if (created) added += 1;
    processed += 1;
  }

  notify.toast(`Importacion completada. Se agregaron ${added} de ${processed} filas procesadas.`, 'success');
  onDone?.();
}

function matrixFromSheet(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
}

export async function importInventoryFile(file, onDone) {
  const name = (file && file.name) || '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) {
    const text = await file.text();
    const matrix = parseCsvTextToMatrix(text);
    await processImportMatrix(matrix, onDone);
    return;
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      notify.toast('El libro no tiene hojas.', 'warning');
      onDone?.();
      return;
    }
    const matrix = matrixFromSheet(sheet);
    await processImportMatrix(matrix, onDone);
    return;
  }
  notify.toast('Formato no soportado. Use CSV o Excel.', 'warning');
  onDone?.();
}
