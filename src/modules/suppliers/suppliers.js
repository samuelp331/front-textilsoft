let suppliers = [];

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

let suppliersListenersAttached = false;

async function loadSuppliersData(query = '') {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const data = await apiClient.get(`/suppliers/proveedores/${q}`);
    const list = Array.isArray(data) ? data : data && Array.isArray(data.results) ? data.results : [];
    suppliers = list.map(mapSupplierFromApi);
    return suppliers;
}

async function refreshSuppliersPage() {
    try {
        await loadSuppliersData();
        renderSuppliersTable();
    } catch (err) {
        console.error('Error cargando proveedores:', err);
        const tableBody = document.querySelector('#suppliersTable tbody');
        if (tableBody) {
            tableBody.innerHTML =
                '<tr><td colspan="7" class="table-message">No se pudieron cargar los proveedores.</td></tr>';
        }
    }
}

function setupSuppliersPage() {
    if (suppliersListenersAttached) return;
    suppliersListenersAttached = true;

    const addSupplierBtn = document.getElementById('addSupplierBtn');
    if (addSupplierBtn) {
        addSupplierBtn.addEventListener('click', () => {
            if (typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && !auth.canPerform('suppliers.manage')) {
                alert('No tienes permisos para agregar proveedores.');
                return;
            }
            openSupplierModal(null);
        });
    }

    const supplierSearchInput = document.getElementById('supplierSearch');
    if (supplierSearchInput) {
        supplierSearchInput.addEventListener('input', handleSupplierSearch);
    }

    const supplierForm = document.getElementById('supplierForm');
    if (supplierForm) supplierForm.addEventListener('submit', handleSaveSupplier);

    const closeSupplierModalBtn = document.getElementById('closeSupplierModal');
    if (closeSupplierModalBtn) {
        closeSupplierModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('supplierModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const rateSupplierBtn = document.getElementById('rateSupplierBtn');
    if (rateSupplierBtn) {
        rateSupplierBtn.addEventListener('click', () => {
            const supplierId = document.getElementById('supplierId').value;
            if (!supplierId) {
                alert('Primero debe seleccionar o guardar un proveedor para poder calificarlo.');
                return;
            }
            openRateSupplierModal(supplierId);
        });
    }

    const closeRateSupplierModalBtn = document.getElementById('closeRateSupplierModal');
    if (closeRateSupplierModalBtn) {
        closeRateSupplierModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('rateSupplierModal');
            if (modal) modal.style.display = 'none';
        });
    }

    const closeRatingsHistBtn = document.getElementById('closeSupplierRatingsHistoryModal');
    if (closeRatingsHistBtn) {
        const btn = closeRatingsHistBtn;
        btn.addEventListener('click', () => {
            const m = document.getElementById('supplierRatingsHistoryModal');
            if (m) m.style.display = 'none';
        });
    }

    const rateSupplierForm = document.getElementById('rateSupplierForm');
    if (rateSupplierForm) rateSupplierForm.addEventListener('submit', handleSaveRating);
}

async function initSuppliersPage() {
    setupSuppliersPage();
    await refreshSuppliersPage();
}

function renderSuppliersTable(filteredSuppliers) {
    const tableBody = document.querySelector('#suppliersTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const suppliersToRender = filteredSuppliers || suppliers;
    if (suppliersToRender.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="table-message">No hay proveedores para mostrar.</td></tr>';
        return;
    }

    const canManageSuppliers =
        typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
            ? auth.canPerform('suppliers.manage')
            : false;

    suppliersToRender.forEach((supplier) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = supplier.name || 'N/A';
        row.insertCell().textContent = supplier.contactPerson || 'N/A';
        row.insertCell().textContent = supplier.email || 'N/A';
        row.insertCell().textContent = supplier.phone || 'N/A';

        const calificacionCell = row.insertCell();
        const avg = supplier.calificacionPromedio;
        if (avg !== null && avg !== undefined && Number.isFinite(avg)) {
            calificacionCell.innerHTML = `<span class="rating-badge">${avg.toFixed(1)}</span>`;
        } else {
            calificacionCell.textContent = 'Sin calificar';
        }

        const histCell = row.insertCell();
        const histBtn = document.createElement('button');
        histBtn.type = 'button';
        histBtn.className = 'secondary-button';
        histBtn.textContent = 'Ver historial';
        histBtn.addEventListener('click', () => openSupplierRatingsHistory(supplier.id, supplier.name));
        histCell.appendChild(histBtn);

        const actionsCell = row.insertCell();
        actionsCell.classList.add('actions');

        if (canManageSuppliers) {
            const editBtn = document.createElement('button');
            editBtn.classList.add('edit-btn');
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => openSupplierModal(supplier));
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.addEventListener('click', () => handleDeleteSupplier(supplier.id));
            actionsCell.appendChild(deleteBtn);
        } else {
            actionsCell.textContent = 'Solo lectura';
        }
    });
}

function openSupplierModal(supplier) {
    const modal = document.getElementById('supplierModal');
    const modalTitle = document.getElementById('supplierModalTitle');
    const supplierForm = document.getElementById('supplierForm');
    if (!modal || !modalTitle || !supplierForm) return;

    supplierForm.reset();
    document.getElementById('supplierId').value = '';

    if (supplier) {
        modalTitle.textContent = 'Editar Proveedor';
        document.getElementById('supplierId').value = supplier.id;
        document.getElementById('supplierName').value = supplier.name || '';
        document.getElementById('supplierContactPerson').value = supplier.contactPerson || '';
        document.getElementById('supplierEmail').value = supplier.email || '';
        document.getElementById('supplierPhone').value = supplier.phone || '';
        document.getElementById('supplierAddress').value = supplier.address || '';
        document.getElementById('supplierNotes').value = supplier.notes || '';
        const ps = document.getElementById('supplierProductsSupplied');
        if (ps) ps.value = supplier.productosSuministrados || '';
    } else {
        modalTitle.textContent = 'Agregar Proveedor';
        const ps = document.getElementById('supplierProductsSupplied');
        if (ps) ps.value = '';
    }
    modal.style.display = 'flex';
}

async function openSupplierRatingsHistory(supplierId, supplierName) {
    const modal = document.getElementById('supplierRatingsHistoryModal');
    const title = document.getElementById('supplierRatingsHistoryTitle');
    const tbody = document.getElementById('supplierRatingsHistoryBody');
    if (!modal || !tbody) return;
    if (title) title.textContent = `Historial de evaluaciones — ${supplierName || ''}`;
    tbody.innerHTML = '<tr><td colspan="6" class="table-message">Cargando…</td></tr>';
    modal.style.display = 'flex';
    try {
        const rows = await apiClient.get(`/suppliers/calificaciones/?proveedor=${encodeURIComponent(supplierId)}`);
        tbody.innerHTML = '';
        if (!Array.isArray(rows) || rows.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="table-message">Sin calificaciones registradas.</td></tr>';
            return;
        }
        rows.forEach((r) => {
            const tr = tbody.insertRow();
            const fecha = r.creado_en ? String(r.creado_en).replace('T', ' ').slice(0, 19) : '—';
            const prom =
                r.promedio != null && Number.isFinite(Number(r.promedio))
                    ? Number(r.promedio).toFixed(1)
                    : '—';
            tr.insertCell().textContent = fecha;
            tr.insertCell().textContent = String(r.calidad_suministro ?? '');
            tr.insertCell().textContent = String(r.cumplimiento_tiempos ?? '');
            tr.insertCell().textContent = String(r.precio_calidad ?? '');
            tr.insertCell().textContent = prom;
            tr.insertCell().textContent = r.comentario || '';
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-message">${e.message}</td></tr>`;
    }
}

function openRateSupplierModal(supplierId) {
    const modal = document.getElementById('rateSupplierModal');
    if (!modal) return;

    document.getElementById('rateSupplierId').value = supplierId;
    document.getElementById('rateCalidadSuministro').value = '';
    document.getElementById('rateCumplimientoTiempos').value = '';
    document.getElementById('ratePrecioCalidad').value = '';
    document.getElementById('rateComentario').value = '';

    modal.style.display = 'flex';
}

async function handleSaveSupplier(event) {
    if (typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && !auth.canPerform('suppliers.manage')) {
        alert('No tienes permisos para guardar proveedores.');
        return;
    }

    event.preventDefault();
    const supplierId = document.getElementById('supplierId').value;
    const supplierDataToSave = {
        name: document.getElementById('supplierName').value,
        contactPerson: document.getElementById('supplierContactPerson').value,
        email: document.getElementById('supplierEmail').value,
        phone: document.getElementById('supplierPhone').value,
        address: document.getElementById('supplierAddress').value,
        notes: document.getElementById('supplierNotes').value,
        productosSuministrados: document.getElementById('supplierProductsSupplied')?.value || '',
    };

    try {
        let savedSupplier;
        if (supplierId) {
            savedSupplier = await apiClient.put(`/suppliers/proveedores/${supplierId}/`, mapSupplierToApi(supplierDataToSave));
        } else {
            savedSupplier = await apiClient.post('/suppliers/proveedores/', mapSupplierToApi(supplierDataToSave));
        }

        await refreshSuppliersPage();
        document.getElementById('supplierModal').style.display = 'none';

        if (savedSupplier && savedSupplier.id) {
            if (confirm('¿Desea calificar este proveedor ahora?')) {
                openRateSupplierModal(savedSupplier.id);
            }
        }
    } catch (error) {
        alert(`Error al guardar proveedor: ${error.message}`);
    }
}

async function handleSaveRating(event) {
    if (typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && !auth.canPerform('suppliers.manage')) {
        alert('No tienes permisos para calificar proveedores.');
        return;
    }

    event.preventDefault();
    const supplierId = parseInt(document.getElementById('rateSupplierId').value, 10);
    const calidad = parseInt(document.getElementById('rateCalidadSuministro').value, 10);
    const tiempos = parseInt(document.getElementById('rateCumplimientoTiempos').value, 10);
    const precio = parseInt(document.getElementById('ratePrecioCalidad').value, 10);
    if (!supplierId || [calidad, tiempos, precio].some((n) => Number.isNaN(n))) {
        alert('Seleccione una puntuación válida en todos los criterios.');
        return;
    }

    const ratingData = {
        proveedor: supplierId,
        calidad_suministro: calidad,
        cumplimiento_tiempos: tiempos,
        precio_calidad: precio,
        comentario: document.getElementById('rateComentario').value,
    };

    try {
        await apiClient.post('/suppliers/calificaciones/', ratingData);
        document.getElementById('rateSupplierModal').style.display = 'none';
        await refreshSuppliersPage();
        alert('Calificación guardada correctamente.');
    } catch (error) {
        alert(`Error al guardar calificación: ${error.message}`);
    }
}

async function handleDeleteSupplier(supplierId) {
    if (typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && !auth.canPerform('suppliers.manage')) {
        alert('No tienes permisos para eliminar proveedores.');
        return;
    }

    if (!confirm('¿Está seguro de que desea eliminar este proveedor?')) return;

    try {
        await apiClient.delete(`/suppliers/proveedores/${supplierId}/`);
        await refreshSuppliersPage();
    } catch (error) {
        alert(`Error al eliminar proveedor: ${error.message}`);
    }
}

async function handleSupplierSearch() {
    const searchTerm = document.getElementById('supplierSearch').value.toLowerCase();
    if (!searchTerm) {
        await refreshSuppliersPage();
        return;
    }

    try {
        await loadSuppliersData(searchTerm);
        renderSuppliersTable();
    } catch (err) {
        console.error(err);
        alert(`Error en la búsqueda: ${err.message}`);
    }
}

window.setupSuppliersPage = setupSuppliersPage;
window.refreshSuppliersPage = refreshSuppliersPage;
window.initSuppliersPage = initSuppliersPage;
