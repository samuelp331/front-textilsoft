const alerts = (() => {
    let currentAlerts = [];

    async function refreshAlerts() {
        if (typeof inventoryData === 'undefined' || typeof inventoryData.checkInventoryAlerts !== 'function') {
            return [];
        }
        currentAlerts = await inventoryData.checkInventoryAlerts();
        return currentAlerts;
    }

    function createAlertSection(title, className) {
        const section = document.createElement('div');
        section.className = `alert-section ${className}`;
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);
        return section;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    async function getUnitForProduct(productId) {
        await inventoryData.loadProducts();
        const product = inventoryData.getProductById(productId);
        return product ? product.unit : 'unidades';
    }

    function canRegisterAlertResolution() {
        return (
            typeof auth !== 'undefined' &&
            typeof auth.canPerform === 'function' &&
            auth.canPerform('inventory.movements.manage')
        );
    }

    async function registerResolution(productId, tipoAlerta, accion, notas = '') {
        if (!canRegisterAlertResolution()) return;
        await apiClient.post('/alerts/resoluciones/', {
            producto: productId,
            tipo_alerta: tipoAlerta,
            accion,
            notas: notas || '',
        });
    }

    const ALERT_REABASTECER_KEY = 'textilsoft_alert_reabastecer';

    /** Tras registrar una entrada desde inventario: si venía de "Reabastecer" en alertas, guarda en historial. */
    async function registerReabastecerIfPendingFromAlert(productId, entradaCantidad, motivo) {
        let raw;
        try {
            raw = sessionStorage.getItem(ALERT_REABASTECER_KEY);
        } catch (_) {
            raw = null;
        }
        if (!raw) return;
        let data;
        try {
            data = JSON.parse(raw);
        } catch (_) {
            try {
                sessionStorage.removeItem(ALERT_REABASTECER_KEY);
            } catch (__) { /* ignore */ }
            return;
        }
        if (Number(data.productId) !== Number(productId)) return;
        try {
            sessionStorage.removeItem(ALERT_REABASTECER_KEY);
        } catch (_) { /* ignore */ }
        if (!canRegisterAlertResolution()) return;
        const notas = `Entrada +${entradaCantidad} u.${motivo ? ` Motivo: ${motivo}` : ''}`.trim();
        await registerResolution(Number(productId), 'low-stock', 'reabastecer', notas);
    }

    window.registerReabastecerIfPendingFromAlert = registerReabastecerIfPendingFromAlert;

    async function displayAlertsHistory() {
        const el = document.getElementById('alertsHistoryList');
        if (!el) return;
        el.innerHTML = '<p class="table-message">Cargando historial…</p>';
        try {
            const rows = await apiClient.get('/alerts/resoluciones/');
            if (!Array.isArray(rows) || rows.length === 0) {
                el.innerHTML = '<p class="table-message">Aún no hay alertas registradas como atendidas.</p>';
                return;
            }
            const esc = (s) => String(s ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            let html =
                '<table class="report-table"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th>'
                + '<th>Acción</th><th>Usuario</th><th>Notas</th></tr></thead><tbody>';
            rows.slice(0, 80).forEach((r) => {
                const fecha = r.creado_en ? String(r.creado_en).replace('T', ' ').slice(0, 19) : '—';
                html += `<tr><td>${fecha}</td><td>${esc(r.producto_nombre)}</td><td>${esc(r.tipo_alerta)}</td>`
                    + `<td>${esc(r.accion)}</td><td>${esc(r.usuario_nombre)}</td>`
                    + `<td>${esc(r.notas)}</td></tr>`;
            });
            html += '</tbody></table>';
            if (rows.length > 80) {
                html += `<p class="table-message">Mostrando 80 de ${rows.length} registros.</p>`;
            }
            el.innerHTML = html;
        } catch (err) {
            el.innerHTML = `<p class="table-message">No se pudo cargar el historial: ${err.message}</p>`;
        }
    }

    async function createAlertItem(alert, className) {
        const alertItem = document.createElement('div');
        alertItem.className = `alert-item ${className}`;
        alertItem.dataset.productId = alert.productId;

        const unit = await getUnitForProduct(alert.productId);
        const ubicacionText = alert.ubicacion ? ` (${alert.ubicacion})` : '';
        let content = '';
        if (alert.type === 'low-stock') {
            content = `
                <div class="alert-content">
                    <div class="alert-title">${alert.productName}${ubicacionText}</div>
                    <div class="alert-message">Stock: <span class="alert-critical">${alert.current}</span> de ${alert.minimum} ${unit}</div>
                </div>
                <div class="alert-actions">
                    <button type="button" class="alert-action-button primary-button" data-action="restock" data-product-id="${alert.productId}">Reabastecer</button>
                </div>
            `;
        } else if (alert.type === 'expiration') {
            content = `
                <div class="alert-content">
                    <div class="alert-title">${alert.productName}${ubicacionText}</div>
                    <div class="alert-message">Vence en <span class="alert-warning">${alert.daysLeft} dias</span> (${formatDate(alert.expirationDate)})</div>
                </div>
                <div class="alert-actions">
                    <button type="button" class="alert-action-button primary-button" data-action="extend" data-product-id="${alert.productId}">Extender</button>
                </div>
            `;
        } else if (alert.type === 'expired') {
            content = `
                <div class="alert-content">
                    <div class="alert-title">${alert.productName}${ubicacionText}</div>
                    <div class="alert-message">Vencio hace <span class="alert-critical">${alert.daysOverdue} dias</span> (${formatDate(alert.expirationDate)})</div>
                </div>
                <div class="alert-actions">
                    <button type="button" class="alert-action-button primary-button" data-action="discard" data-product-id="${alert.productId}">Descartar</button>
                </div>
            `;
        }

        alertItem.innerHTML = content;
        const actionButtons = alertItem.querySelectorAll('.alert-action-button');
        actionButtons.forEach((button) => {
            button.addEventListener('click', handleAlertAction);
        });
        return alertItem;
    }

    async function displayAlerts() {
        const list = document.getElementById('alertsList');
        if (!list) return;
        list.innerHTML = '';

        let allAlerts;
        try {
            allAlerts = await refreshAlerts();
        } catch (err) {
            console.error('Error al cargar alertas:', err);
            const errMsg = document.createElement('div');
            errMsg.className = 'no-alerts-message';
            errMsg.textContent =
                'No se pudieron cargar las alertas. Comprueba tu sesion o los permisos de tu rol.';
            list.appendChild(errMsg);
            updateAlertCount(0);
            await displayAlertsHistory();
            return;
        }

        if (!allAlerts.length) {
            const noAlertsMsg = document.createElement('div');
            noAlertsMsg.className = 'no-alerts-message';
            noAlertsMsg.textContent = 'No hay alertas pendientes.';
            list.appendChild(noAlertsMsg);
            updateAlertCount(0);
            await displayAlertsHistory();
            return;
        }

        const expiredAlerts = allAlerts.filter((a) => a.type === 'expired');
        const expirationAlerts = allAlerts.filter((a) => a.type === 'expiration');
        const lowStockAlerts = allAlerts.filter((a) => a.type === 'low-stock');

        for (const [title, className, alertsByType, rowClass] of [
            ['Productos Vencidos', 'expired-section', expiredAlerts, 'expired-alert'],
            ['Productos Proximos a Vencer', 'expiration-section', expirationAlerts, 'expiration-alert'],
            ['Productos con Stock Bajo', 'low-stock-section', lowStockAlerts, 'low-stock-alert'],
        ]) {
            if (!alertsByType.length) continue;
            const section = createAlertSection(title, className);
            for (const alert of alertsByType) {
                const item = await createAlertItem(alert, rowClass);
                section.appendChild(item);
            }
            list.appendChild(section);
        }

        updateAlertCount(allAlerts.length);
        await displayAlertsHistory();
    }

    function updateAlertCount(count) {
        const alertCounter = document.getElementById('alertCount');
        if (!alertCounter) return;
        alertCounter.textContent = count;
        alertCounter.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    async function showUpdateInventoryModal(productId, type = 'entrada') {
        if (typeof navigation !== 'undefined' && typeof navigation.showPage === 'function') {
            navigation.showPage('productPage');
            setTimeout(async () => {
                if (typeof openUpdateInventoryModal !== 'function') return;
                await openUpdateInventoryModal({ keepPendingAlertReabastecer: true });
                const productSelect = document.getElementById('updateProductSelect');
                const typeSelect = document.getElementById('updateType');
                if (productSelect) productSelect.value = String(productId);
                if (typeSelect) typeSelect.value = type;
            }, 400);
        }
    }

    async function showExtendExpirationModal(productId) {
        await inventoryData.loadProducts();
        const product = inventoryData.getProductById(productId);
        if (!product) return;
        const newDate = prompt(`Nueva fecha de vencimiento para ${product.name} (YYYY-MM-DD):`, product.expirationDate || '');
        if (!newDate) return;
        await inventoryData.updateProduct(productId, { expirationDate: newDate });
        try {
            await registerResolution(productId, 'expiration', 'extender', `Nueva fecha: ${newDate}`);
        } catch (e) {
            console.warn('No se pudo registrar resolución de alerta:', e);
        }
        await displayAlerts();
    }

    async function showDiscardProductModal(productId) {
        await inventoryData.loadProducts();
        const product = inventoryData.getProductById(productId);
        if (!product) return;
        const quantityText = prompt(`Cantidad a descartar de ${product.name}:`, String(product.quantity));
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
            } catch (e) {
                console.warn('No se pudo registrar resolución de alerta:', e);
            }
            await displayAlerts();
        } catch (error) {
            alert(`No se pudo completar el descarte: ${error?.message || error}`);
        }
    }

    async function handleAlertAction(event) {
        const action = event.target.dataset.action;
        const productId = Number(event.target.dataset.productId);
        if (action === 'restock') {
            try {
                sessionStorage.setItem(ALERT_REABASTECER_KEY, JSON.stringify({ productId }));
            } catch (_) { /* ignore */ }
            await showUpdateInventoryModal(productId, 'entrada');
        } else if (action === 'extend') {
            await showExtendExpirationModal(productId);
        } else if (action === 'discard') {
            await showDiscardProductModal(productId);
        }
    }

    function toggleEmailFieldsVisibility(enabled) {
        const emailSettings = document.getElementById('emailSettings');
        if (!emailSettings) return;
        emailSettings.classList.toggle('hidden', !enabled);
    }

    function populateNotificationSettingsForm() {
        if (typeof inventoryData === 'undefined' || typeof inventoryData.getNotificationSettings !== 'function') return;
        const s = inventoryData.getNotificationSettings();
        const inApp = document.getElementById('notifyInApp');
        const desktop = document.getElementById('notifyDesktop');
        const emailEn = document.getElementById('notifyEmailEnabled');
        const addr = document.getElementById('notifyEmailAddress');
        if (inApp) inApp.checked = !!s.inApp?.enabled;
        if (desktop) desktop.checked = !!s.desktop?.enabled;
        if (emailEn) emailEn.checked = !!s.email?.enabled;
        if (addr) addr.value = s.email?.address || '';
        toggleEmailFieldsVisibility(!!emailEn?.checked);
    }

    let notificationUiBound = false;

    function bindNotificationSettingsUiOnce() {
        if (notificationUiBound) return;
        const form = document.getElementById('notificationSettingsForm');
        const emailEn = document.getElementById('notifyEmailEnabled');
        if (!form || !emailEn) return;
        notificationUiBound = true;

        emailEn.addEventListener('change', () => toggleEmailFieldsVisibility(emailEn.checked));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof inventoryData === 'undefined' || typeof inventoryData.updateNotificationSettings !== 'function') {
                return;
            }

            inventoryData.updateNotificationSettings({
                inApp: { enabled: !!document.getElementById('notifyInApp')?.checked },
                desktop: { enabled: !!document.getElementById('notifyDesktop')?.checked },
                email: {
                    enabled: !!document.getElementById('notifyEmailEnabled')?.checked,
                    address: (document.getElementById('notifyEmailAddress')?.value || '').trim(),
                },
            });

            const wantDesktop = !!document.getElementById('notifyDesktop')?.checked;
            if (wantDesktop && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }

            const modal = document.getElementById('notificationSettingsModal');
            if (modal && typeof window.closeModal === 'function') {
                window.closeModal(modal);
            }
        });
    }

    function openNotificationSettingsModal() {
        bindNotificationSettingsUiOnce();
        if (typeof inventoryData === 'undefined' || typeof inventoryData.getNotificationSettings !== 'function') {
            alert('No se pudo cargar la configuracion. Recargue la pagina.');
            return;
        }
        populateNotificationSettingsForm();
        const modal = document.getElementById('notificationSettingsModal');
        if (!modal) return;
        modal.style.display = 'block';
    }

    function setupAlertButtons() {
        const configBtn = document.getElementById('alertConfigBtn');
        if (configBtn) {
            const newConfigBtn = configBtn.cloneNode(true);
            configBtn.parentNode.replaceChild(newConfigBtn, configBtn);
            newConfigBtn.addEventListener('click', openNotificationSettingsModal);
        }

        const refreshBtn = document.getElementById('refreshAlertsBtn');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
            newRefreshBtn.addEventListener('click', async () => {
                await displayAlerts();
                alert('Alertas e historial actualizados correctamente.');
            });
        }
    }

    async function initAlerts() {
        setupAlertButtons();

        const alertsPage = document.getElementById('alertsPage');
        if (alertsPage) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (
                        mutation.type === 'attributes' &&
                        mutation.attributeName === 'class' &&
                        alertsPage.classList.contains('active')
                    ) {
                        setupAlertButtons();
                        displayAlerts().catch((e) => console.error('Alertas:', e));
                    }
                }
            });
            observer.observe(alertsPage, { attributes: true });
        }

        await displayAlerts();
    }

    return {
        initAlerts,
        refreshAlerts,
        displayAlerts,
    };
})();

window.initAlerts = alerts.initAlerts;
