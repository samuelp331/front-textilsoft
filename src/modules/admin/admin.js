// Panel administrativo: KPIs desde /api/admin/resumen/ y alertas desde /api/alerts/

function escapeAdminHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
}

function rolDisplayName(slug) {
    if (!slug) return '—';
    const map = {
        operario: 'Operario',
        bodeguero: 'Bodeguero',
        supervisor: 'Supervisor',
        administrador: 'Administrador',
    };
    return map[slug] || slug;
}

async function loadAdminUsersList() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="admin-users-loading">Cargando…</td></tr>';
    try {
        const rows = await apiClient.get('/admin/usuarios/');
        if (!Array.isArray(rows)) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-users-loading">Respuesta invalida.</td></tr>';
            return;
        }
        const myId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.id : null;
        tbody.innerHTML = '';
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-users-loading">No hay usuarios.</td></tr>';
            return;
        }
        rows.forEach((u) => {
            const tr = document.createElement('tr');
            const rolSlug = u.rol && u.rol.nombre ? u.rol.nombre : '';
            const estadoLabel = u.estado === 'activo' ? 'Activo' : 'Inactivo';
            const canDeactivate = u.estado === 'activo' && u.id !== myId;
            const actionsHtml = `
                <button type="button" class="admin-user-edit-btn" data-id="${u.id}">Editar</button>
                ${canDeactivate ? `<button type="button" class="admin-user-deactivate-btn" data-id="${u.id}">Desactivar</button>` : ''}
            `;
            tr.innerHTML = `
                <td>${escapeAdminHtml(u.nombre)}</td>
                <td>${escapeAdminHtml(u.email)}</td>
                <td>${escapeAdminHtml(rolDisplayName(rolSlug))}</td>
                <td>${escapeAdminHtml(estadoLabel)}</td>
                <td class="admin-users-actions">${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.warn('Gestion usuarios:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="admin-users-loading">No se pudieron cargar los usuarios. ${escapeAdminHtml(e.message)}</td></tr>`;
    }
}

async function openEditAdminUser(id) {
    try {
        const u = await apiClient.get(`/admin/usuarios/${id}/`);
        const form = document.getElementById('adminUserForm');
        const estadoRow = document.getElementById('adminUserEstadoRow');
        document.getElementById('adminUserEditId').value = String(u.id);
        document.getElementById('adminUserFormTitle').textContent = 'Editar usuario';
        document.getElementById('adminUserNombre').value = u.nombre || '';
        document.getElementById('adminUserEmail').value = u.email || '';
        document.getElementById('adminUserPassword').value = '';
        document.getElementById('adminUserPassword').required = false;
        document.getElementById('adminUserPasswordLabel').textContent = 'Contraseña (opcional)';
        const rolSlug = u.rol && u.rol.nombre ? u.rol.nombre : 'operario';
        document.getElementById('adminUserRol').value = rolSlug;
        document.getElementById('adminUserEstado').value = u.estado === 'inactivo' ? 'inactivo' : 'activo';
        if (estadoRow) estadoRow.hidden = false;
        form.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
        alert(`No se pudo cargar el usuario: ${e.message}`);
    }
}

async function deactivateAdminUser(id) {
    if (!confirm('¿Desactivar esta cuenta? El acceso se bloqueara de inmediato en el servidor.')) return;
    try {
        await apiClient.delete(`/admin/usuarios/${id}/`);
    } catch (e) {
        alert(`Error: ${e.message}`);
    }
}

function showNewAdminUserForm() {
    const form = document.getElementById('adminUserForm');
    const estadoRow = document.getElementById('adminUserEstadoRow');
    document.getElementById('adminUserEditId').value = '';
    document.getElementById('adminUserFormTitle').textContent = 'Nuevo usuario';
    document.getElementById('adminUserNombre').value = '';
    document.getElementById('adminUserEmail').value = '';
    document.getElementById('adminUserPassword').value = '';
    document.getElementById('adminUserPassword').required = true;
    document.getElementById('adminUserPasswordLabel').textContent = 'Contraseña';
    document.getElementById('adminUserRol').value = 'operario';
    if (estadoRow) estadoRow.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function bindAdminUsersPanel() {
    if (bindAdminUsersPanel.done) return;
    bindAdminUsersPanel.done = true;

    document.getElementById('adminUsersTableBody')?.addEventListener('click', async (ev) => {
        const t = ev.target;
        if (t.classList.contains('admin-user-edit-btn')) {
            const id = parseInt(t.getAttribute('data-id'), 10);
            if (!Number.isNaN(id)) await openEditAdminUser(id);
            return;
        }
        if (t.classList.contains('admin-user-deactivate-btn')) {
            const id = parseInt(t.getAttribute('data-id'), 10);
            if (!Number.isNaN(id)) await deactivateAdminUser(id);
            await loadAdminUsersList();
        }
    });

    document.getElementById('adminUserNewBtn')?.addEventListener('click', () => {
        showNewAdminUserForm();
    });
    document.getElementById('adminUserCancelBtn')?.addEventListener('click', () => {
        const form = document.getElementById('adminUserForm');
        if (form) form.hidden = true;
    });
    document.getElementById('adminUserForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('adminUserEditId').value.trim();
        const nombre = document.getElementById('adminUserNombre').value.trim();
        const email = document.getElementById('adminUserEmail').value.trim();
        const password = document.getElementById('adminUserPassword').value;
        const rol = document.getElementById('adminUserRol').value;
        const estadoEl = document.getElementById('adminUserEstado');
        const estado = estadoEl ? estadoEl.value : 'activo';

        if (!nombre || !email || !rol) {
            alert('Complete nombre, correo y rol.');
            return;
        }

        try {
            if (!id) {
                if (!password || password.length < 6) {
                    alert('La contraseña debe tener al menos 6 caracteres.');
                    return;
                }
                await apiClient.post('/admin/usuarios/', { nombre, email, password, rol });
            } else {
                const body = { nombre, email, rol, estado };
                if (password && password.length >= 6) body.password = password;
                await apiClient.patch(`/admin/usuarios/${id}/`, body);
            }
            document.getElementById('adminUserForm').hidden = true;
            await loadAdminUsersList();
        } catch (err) {
            alert(`Error al guardar: ${err.message}`);
        }
    });
}

async function fetchAdminResumenFromApi() {
    try {
        const data = await apiClient.get('/admin/resumen/');
        if (data && typeof data === 'object') return data;
    } catch (e) {
        console.warn('Panel admin: no se pudo obtener /admin/resumen/', e);
    }
    return null;
}

async function fetchAdminResumenFallback() {
    await inventoryData.loadProducts();
    const products = inventoryData.getProducts();

    let proveedoresCount = 0;
    try {
        const sup = await apiClient.get('/suppliers/proveedores/');
        proveedoresCount = Array.isArray(sup) ? sup.length : 0;
    } catch (_) {
        /* ignorar */
    }

    let movimientosCount = 0;
    try {
        const movs = await inventoryData.getInventoryMovements();
        movimientosCount = Array.isArray(movs) ? movs.length : 0;
    } catch (_) {
        /* ignorar */
    }

    return {
        usuarios_activos: null,
        productos: products.length,
        productos_stock_ok: products.filter((p) => Number(p.quantity) > Number(p.minQuantity)).length,
        proveedores: proveedoresCount,
        movimientos: movimientosCount,
    };
}

function setStatText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (value === null || value === undefined) {
        el.textContent = '—';
        return;
    }
    el.textContent = String(value);
}

async function loadAdminStats() {
    try {
        let resumen = await fetchAdminResumenFromApi();
        if (!resumen) {
            resumen = await fetchAdminResumenFallback();
        }

        const allAlerts = await inventoryData.checkInventoryAlerts();

        const lowStockCount = allAlerts.filter((a) => a.type === 'low-stock').length;
        const expiringCount = allAlerts.filter((a) => a.type === 'expiration').length;
        const expiredCount = allAlerts.filter((a) => a.type === 'expired').length;
        const vencimientoIncidencias = expiringCount + expiredCount;

        const uniqueWithAlert = new Set(allAlerts.map((a) => a.productId)).size;

        setStatText('statTotalProducts', resumen.productos);
        setStatText('statActiveAlerts', allAlerts.length);
        setStatText('statUniqueAlertProducts', uniqueWithAlert);
        setStatText('statTotalUsers', resumen.usuarios_activos);
        setStatText('statTotalSuppliers', resumen.proveedores);
        setStatText('statLowStock', lowStockCount);
        setStatText('statExpiringSoon', vencimientoIncidencias);
        setStatText('statInStock', resumen.productos_stock_ok);
        setStatText('statTotalMovements', resumen.movimientos);

        updateInventoryChart(lowStockCount, vencimientoIncidencias, resumen.productos_stock_ok);
        updateAdminAlertsList(allAlerts);
    } catch (error) {
        console.error('Error loading admin stats:', error);
        const list = document.getElementById('adminAlertsList');
        if (list) {
            list.innerHTML =
                '<p class="no-alerts">No se pudieron cargar los datos. Comprueba la sesion y el servidor.</p>';
        }
    }
}

function updateInventoryChart(lowStock, expiring, ok) {
    const total = lowStock + expiring + ok;
    const denominator = total > 0 ? total : 1;
    const maxHeight = 150;

    const barLowStock = document.getElementById('barLowStock');
    const barExpiring = document.getElementById('barExpiring');
    const barOk = document.getElementById('barOk');

    if (barLowStock) barLowStock.style.height = `${(lowStock / denominator) * maxHeight}px`;
    if (barExpiring) barExpiring.style.height = `${(expiring / denominator) * maxHeight}px`;
    if (barOk) barOk.style.height = `${(ok / denominator) * maxHeight}px`;
}

function updateAdminAlertsList(alerts) {
    const alertsList = document.getElementById('adminAlertsList');
    if (!alertsList) return;

    if (!alerts || alerts.length === 0) {
        alertsList.innerHTML = '<p class="no-alerts">No hay alertas activas.</p>';
        return;
    }

    alertsList.innerHTML = '';
    const recentAlerts = alerts.slice(0, 10);

    recentAlerts.forEach((alert) => {
        const item = document.createElement('div');
        item.className = `admin-alert-item ${alert.type}`;

        let message = '';
        if (alert.type === 'low-stock') {
            message = `Stock: ${alert.current} de ${alert.minimum}`;
        } else if (alert.type === 'expiration') {
            message = `Vence en ${alert.daysLeft} dias`;
        } else if (alert.type === 'expired') {
            message = `Vencio hace ${alert.daysOverdue} dias`;
        }

        const ubic = alert.ubicacion ? ` (${alert.ubicacion})` : '';
        item.innerHTML = `
            <div class="admin-alert-title">${alert.productName}${ubic}</div>
            <div class="admin-alert-message">${message}</div>
        `;
        alertsList.appendChild(item);
    });
}

function bindAdminQuickNav() {
    if (bindAdminQuickNav.done) return;
    bindAdminQuickNav.done = true;
    document.querySelectorAll('[data-admin-nav-page]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const pageId = btn.getAttribute('data-admin-nav-page');
            if (
                typeof navigation !== 'undefined' &&
                typeof navigation.showPage === 'function' &&
                pageId
            ) {
                navigation.showPage(pageId);
            }
        });
    });
}

async function initAdminPanel() {
    const adminPage = document.getElementById('adminPage');
    if (!adminPage) return;

    bindAdminQuickNav();
    bindAdminUsersPanel();

    let loadPending = false;
    const observer = new MutationObserver(() => {
        if (!adminPage.classList.contains('active')) return;
        if (loadPending) return;
        loadPending = true;
        requestAnimationFrame(async () => {
            try {
                await loadAdminStats();
                await loadAdminUsersList();
            } finally {
                loadPending = false;
            }
        });
    });
    observer.observe(adminPage, { attributes: true, attributeFilter: ['class'] });

    if (adminPage.classList.contains('active')) {
        await loadAdminStats();
        await loadAdminUsersList();
    }
}

window.initAdminPanel = initAdminPanel;
