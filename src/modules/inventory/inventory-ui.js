// Inventory UI Management Module

// This module is responsible for rendering the inventory table
// and handling UI-specific interactions like search and table button clicks.
// It relies on the globally available 'inventoryData' module for data access
// and 'inventoryModals' functions for opening modals.

// Function to display the inventory UI table
async function displayInventoryUI() {
    console.log("Attempting to display inventory UI...");
    const productContent = document.getElementById('productContent');
    if (!productContent) {
        console.error("productContent element not found for UI display!");
        return;
    }

    // Ensure inventoryData module is available
    if (typeof inventoryData === 'undefined' || typeof inventoryData.getProducts !== 'function') {
        console.error("Inventory data source (inventoryData) not available or invalid.");
        productContent.innerHTML = '<h2>Inventario</h2><p>Error al cargar los datos del inventario: Módulo de datos no encontrado.</p>';
        return;
    }

    // Load ubicaciones and categorias for filter dropdowns
    let ubicaciones = [];
    let categorias = [];
    if (typeof inventoryData.loadUbicaciones === 'function') {
        ubicaciones = await inventoryData.loadUbicaciones();
    }
    if (typeof inventoryData.getCategorias === 'function') {
        categorias = await inventoryData.getCategorias();
    }

    await inventoryData.loadProducts();
    const products = inventoryData.getProducts();
    const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.products.manage');

    let ubicacionOptions = '<option value="">Todas las ubicaciones</option>';
    ubicaciones.forEach(ub => {
        ubicacionOptions += `<option value="${ub.id}">Pasillo ${ub.pasillo} - Estante ${ub.estante} - Sección ${ub.seccion}</option>`;
    });

    let categoriaOptions = '<option value="">Todas las categorías</option>';
    categorias.forEach(cat => {
        categoriaOptions += `<option value="${cat}">${cat}</option>`;
    });

    let tableHTML = `
        <h2>Inventario de Productos</h2>
        <div class="search-container">
            <input type="search" id="productSearch" placeholder="Buscar Producto" onkeyup="filterProductsUI()">
            <select id="filterCategoria" onchange="filterProductsUI()">
                ${categoriaOptions}
            </select>
            <select id="filterUbicacion" onchange="filterProductsUI()">
                ${ubicacionOptions}
            </select>
        </div>
        <table class="inventory-table">
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
            <tbody id="inventoryTableBody">
    `;

    if (products.length === 0) {
        tableHTML += `
            <tr>
                <td colspan="10" class="no-products">No hay productos en el inventario</td>
            </tr>
        `;
    } else {
        // Obtener la fecha actual para comparar con la fecha de vencimiento
        const today = new Date();
        
        products.forEach((item) => {
            /* Comparar siempre en número: "10" <= "5" como string es true en JS (orden lexicográfico). */
            const qty = Number(item.quantity);
            const minQty = Number(item.minQuantity ?? 0);
            const isLowStock =
                !Number.isNaN(qty) && !Number.isNaN(minQty) && qty <= minQty;

            let expirationStatus = '';
            let expirationClass = '';

            const notifyLead = Number(item.notifyDaysBefore ?? 30);

            if (item.expirationDate) {
                const expirationDate = new Date(item.expirationDate);
                const daysToExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

                if (daysToExpiration < 0) {
                    expirationStatus = 'Vencido';
                    expirationClass = 'expired';
                } else if (daysToExpiration <= notifyLead) {
                    expirationStatus = 'Próximo';
                    expirationClass = 'expiring';
                }
            }
            
            tableHTML += `
                <tr data-id="${item.id}" class="${isLowStock ? 'low-stock' : ''} ${expirationClass}">
                    <td>${item.id}</td>
                    <td>${item.code || ''}</td>
                    <td>${item.name}</td>
                    <td>${item.category || ''}</td>
                    <td>${item.ubicacionDetalle ? `P${item.ubicacionDetalle.pasillo}-E${item.ubicacionDetalle.estante}-S${item.ubicacionDetalle.seccion}` : 'Sin ubicación'}</td>
                    <td>${item.quantity} ${item.unit || ''}</td>
                    <td>${item.minQuantity || 0}</td>
                    <td>$${(item.price || 0).toLocaleString()}</td>
                    <td class="${expirationClass}">${item.expirationDate ? formatDate(item.expirationDate) + (expirationStatus ? ` (${expirationStatus})` : '') : 'N/A'}</td>
                    <td>
                        ${canManageProducts
        ? `<button class="edit-btn" data-id="${item.id}">Editar</button>
                        <button class="delete-btn" data-id="${item.id}">Eliminar</button>`
        : 'Solo lectura'}
                    </td>
                </tr>
            `;
        });
    }

    tableHTML += `
            </tbody>
        </table>
    `;

    productContent.innerHTML = tableHTML;
    console.log("Inventory table rendered with additional columns for min quantity and expiration date.");

    const canAudit =
        typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
            ? auth.canPerform('inventory.products.manage')
            : false;
    if (canAudit) {
        appendInventoryDeletionAudit(productContent).catch((e) => console.warn('Historial productos eliminados:', e));
    }

    // Attach listeners after the table is rendered
    attachTableButtonListenersUI();
}

async function appendInventoryDeletionAudit(container) {
    let wrap = document.getElementById('inventoryDeletionAudit');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'inventoryDeletionAudit';
        wrap.className = 'inventory-deletion-audit';
        container.appendChild(wrap);
    }
    wrap.innerHTML = '<h3>Historial de productos eliminados</h3><p>Cargando…</p>';
    try {
        const rows = await apiClient.get('/inventory/eliminaciones-productos/?limite=15');
        if (!Array.isArray(rows) || rows.length === 0) {
            wrap.innerHTML =
                '<h3>Historial de productos eliminados</h3><p class="table-message">Sin registros de eliminación.</p>';
            return;
        }
        let html = '<h3>Historial de productos eliminados</h3><table class="inventory-table"><thead><tr>'
            + '<th>Fecha</th><th>Código</th><th>Nombre</th><th>Categoría</th><th>Cant. al eliminar</th><th>Usuario</th>'
            + '</tr></thead><tbody>';
        rows.forEach((r) => {
            const fecha = r.eliminado_en ? String(r.eliminado_en).replace('T', ' ').slice(0, 19) : '—';
            const usr = r.eliminado_por_nombre || '—';
            html += `<tr><td>${fecha}</td><td>${r.codigo || ''}</td><td>${r.nombre || ''}</td>`
                + `<td>${r.categoria || ''}</td><td>${r.cantidad_al_eliminar ?? ''}</td><td>${usr}</td></tr>`;
        });
        html += '</tbody></table>';
        wrap.innerHTML = html;
    } catch (err) {
        wrap.innerHTML =
            `<h3>Historial de productos eliminados</h3><p class="table-message">${err.message || err}</p>`;
    }
}

// Function to attach listeners to the table buttons (Edit, Delete)
function attachTableButtonListenersUI() {
    console.log("Attaching table button listeners...");
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) {
        console.error("Inventory table body not found for listener attachment.");
        return;
    }

    if (!tableBody.dataset.clickListenerAttached) {
        const listener = async (e) => {
            const target = e.target;

            if (target.classList.contains('edit-btn')) {
                const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
                    && auth.canPerform('inventory.products.manage');
                if (!canManageProducts) {
                    alert('No tienes permisos para editar productos.');
                    return;
                }
                try {
                    const id = parseInt(target.dataset.id);
                    if (isNaN(id)) {
                        console.error("Invalid product ID for edit:", target.dataset.id);
                        return;
                    }
                    console.log("Edit button clicked for ID:", id);
                    if (typeof openAddProductModal === 'function') {
                         openAddProductModal('edit', id);
                     } else {
                         console.error("openAddProductModal function not found. Make sure inventory-product-modal.js is loaded correctly.");
                         alert("Funcionalidad de edición no disponible.");
                     }
                } catch (err) {
                    console.error("Error initiating product edit:", err);
                    alert("Hubo un error al intentar editar el producto.");
                }
            }

            else if (target.classList.contains('delete-btn')) {
                const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
                    && auth.canPerform('inventory.products.manage');
                if (!canManageProducts) {
                    alert('No tienes permisos para eliminar productos.');
                    return;
                }
                try {
                    const id = parseInt(target.dataset.id);
                    if (isNaN(id)) {
                        console.error("Invalid product ID for delete:", target.dataset.id);
                        return;
                    }
                    console.log("Delete button clicked for ID:", id);
                    if (confirm('¿Está seguro que desea eliminar este producto?')) {
                        if (typeof inventoryData === 'undefined' || typeof inventoryData.deleteProduct !== 'function') {
                            console.error("Inventory data source (inventoryData) not available or invalid for deletion.");
                            alert('Error interno al intentar eliminar.');
                            return;
                        }
                        if (await inventoryData.deleteProduct(id)) {
                            console.log(`Product ${id} deleted.`);
                            await displayInventoryUI();
                        } else {
                            alert('No se pudo encontrar el producto para eliminar.');
                            console.warn("Deletion failed: Product ID not found or delete function returned false.", id);
                        }
                    }
                } catch (err) {
                    console.error("Error deleting product:", err);
                    alert("Hubo un error al eliminar el producto.");
                }
            }
        };

        tableBody.addEventListener('click', listener);
        tableBody.dataset.clickListenerAttached = 'true'; 
        console.log("Table button listeners attached using event delegation.");
     } else {
         console.log("Table button listener already attached.");
     }
}

// Function to filter products in the displayed table
function filterProductsUI() {
    const input = document.getElementById('productSearch');
    if (!input) {
         console.warn("Product search input not found for filtering.");
         return;
    }
    const searchFilter = input.value.toLowerCase();

    const categoriaFilter = document.getElementById('filterCategoria')?.value || '';
    const ubicacionFilter = document.getElementById('filterUbicacion')?.value || '';

    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) {
         console.warn("Inventory table body not found for filtering.");
         return;
    }
    const rows = tableBody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.classList.contains('no-products')) continue;

        const cells = row.getElementsByTagName('td');
        if (cells.length < 10) {
            row.style.display = 'none';
            continue;
        }

        const codeCell = cells[1];
        const nameCell = cells[2];
        const categoryCell = cells[3];
        const ubicacionCell = cells[4];

        if (codeCell && nameCell && categoryCell) {
            const codeText = codeCell.textContent || codeCell.innerText;
            const nameText = nameCell.textContent || nameCell.innerText;
            const categoryText = categoryCell.textContent || categoryCell.innerText;
            const ubicacionText = ubicacionCell.textContent || ubicacionCell.innerText;

            const matchesSearch = codeText.toLowerCase().includes(searchFilter) ||
                nameText.toLowerCase().includes(searchFilter) ||
                categoryText.toLowerCase().includes(searchFilter);

            const matchesCategoria = !categoriaFilter || categoryText === categoriaFilter;
            const matchesUbicacion = !ubicacionFilter || ubicacionText.includes(ubicacionFilter);

            if (matchesSearch && matchesCategoria && matchesUbicacion) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        } else {
             row.style.display = 'none';
        }
    }
}

// Function to clear the inventory display area
function clearInventoryDisplayUI() {
    console.log("Clearing Inventory UI display.");
    const productContent = document.getElementById('productContent');
    if (productContent) {
        productContent.innerHTML = '<h2>Inventario</h2><p>Opciones para gestionar inventario.</p>'; 
    } else {
        console.warn("productContent element not found for clearing.");
    }
}

// Función para formatear la fecha en un formato legible
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Expose necessary functions globally for HTML attribute and inventory.js
window.displayInventoryUI = displayInventoryUI;
window.filterProductsUI = filterProductsUI;
window.clearInventoryDisplayUI = clearInventoryDisplayUI;
