import { api } from './api.js';

const ALERT_REABASTECER_KEY = 'textilsoft_alert_reabastecer';

/** @param {(action: string) => boolean} canPerform */
export async function registerReabastecerIfPendingFromAlert(productId, entradaCantidad, motivo, canPerform) {
  let raw;
  try {
    raw = sessionStorage.getItem(ALERT_REABASTECER_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    try {
      sessionStorage.removeItem(ALERT_REABASTECER_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  if (Number(data.productId) !== Number(productId)) return;
  try {
    sessionStorage.removeItem(ALERT_REABASTECER_KEY);
  } catch {
    /* ignore */
  }
  if (!canPerform('inventory.movements.manage')) return;
  const notas = `Entrada +${entradaCantidad} u.${motivo ? ` Motivo: ${motivo}` : ''}`.trim();
  await api.post('/alerts/resoluciones/', {
    producto: Number(productId),
    tipo_alerta: 'low-stock',
    accion: 'reabastecer',
    notas,
  });
}

export function setPendingReabastecer(productId) {
  try {
    sessionStorage.setItem(ALERT_REABASTECER_KEY, JSON.stringify({ productId }));
  } catch {
    /* ignore */
  }
}

export function clearPendingReabastecer() {
  try {
    sessionStorage.removeItem(ALERT_REABASTECER_KEY);
  } catch {
    /* ignore */
  }
}
