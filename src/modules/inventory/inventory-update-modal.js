// Inventory Update Modal Module

// Esta función abre el modal de actualización de inventario y carga los productos disponibles
// opts.keepPendingAlertReabastecer: si es true, no borra la marca de "reabastecer desde alerta" (flujo Reabastecer).
async function openUpdateInventoryModal(opts = {}) {
    const keepPending = opts && opts.keepPendingAlertReabastecer === true;
    if (!keepPending) {
        try {
            sessionStorage.removeItem('textilsoft_alert_reabastecer');
        } catch (_) { /* ignore */ }
    }

    console.log("Abriendo modal de actualización de inventario");
    const modal = document.getElementById('updateInventoryModal');
    const form = document.getElementById('updateInventoryForm');
    const productSelect = document.getElementById('updateProductSelect');
    const updateTypeSelect = document.getElementById('updateType');
    
    if (!modal || !form || !productSelect || !updateTypeSelect) {
        console.error("No se encontraron elementos necesarios para el modal de actualización de inventario");
        alert("Error: No se pudo abrir el formulario de actualización");
        return;
    }
    
    // Limpiar el formulario
    form.reset();

    const canManageMovements = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.movements.manage');
    const canCreateMovements = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.movements.create');
    if (!canManageMovements && !canCreateMovements) {
        alert('No tienes permisos para registrar movimientos de inventario.');
        return;
    }

    // Operario: solo salida. Otros roles: todos los tipos.
    if (canCreateMovements && !canManageMovements) {
        updateTypeSelect.innerHTML = '<option value="salida">Salida</option>';
        updateTypeSelect.value = 'salida';
    } else {
        updateTypeSelect.innerHTML = `
            <option value="">Tipo de Actualización</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste</option>
        `;
    }
    
    // Limpiar y cargar las opciones de productos
    productSelect.innerHTML = '<option value="">Seleccionar Producto</option>';
    
    // Obtener productos del inventario
    await inventoryData.loadProducts();
    const products = inventoryData.getProducts();
    
    // Poblar el selector de productos
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${product.code || 'Sin código'}) - Stock: ${product.quantity}`;
        productSelect.appendChild(option);
    });
    
    // Mostrar el modal
    modal.style.display = 'block';
}

// Función para manejar el envío del formulario de actualización
async function handleUpdateInventoryFormSubmit(event) {
    event.preventDefault();
    console.log("Formulario de actualización de inventario enviado");
    
    const form = event.target;
    const modal = document.getElementById('updateInventoryModal');
    const productId = document.getElementById('updateProductSelect').value;
    const updateType = document.getElementById('updateType').value;
    const canManageMovements = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.movements.manage');
    const canCreateMovements = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.movements.create');
    if (!canManageMovements && !canCreateMovements) {
        alert('No tienes permisos para registrar movimientos de inventario.');
        return;
    }
    if (canCreateMovements && !canManageMovements && updateType !== 'salida') {
        alert('Como operario solo puedes registrar salidas de insumos.');
        return;
    }

    const quantity = parseInt(document.getElementById('updateQuantity').value);
    const reason = document.getElementById('updateReason').value;
    
    // Validar campos básicos
    if (!productId || !updateType || isNaN(quantity) || !reason) {
        alert('Por favor, complete todos los campos correctamente');
        return;
    }
    
    // Validación específica según el tipo de actualización
    if ((updateType === 'entrada' || updateType === 'salida') && quantity <= 0) {
        alert('Para entradas y salidas, la cantidad debe ser mayor a cero');
        return;
    }
    
    // Obtener el producto seleccionado (stock actual; el backend aplica el cambio al registrar el movimiento)
    const product = inventoryData.getProductById(parseInt(productId));
    if (!product) {
        alert('Producto no encontrado');
        return;
    }

    const originalQuantity = product.quantity;

    if (updateType === 'salida' && product.quantity < quantity) {
        alert(`No hay suficiente stock. Stock actual: ${product.quantity}`);
        return;
    }

    let movementQuantity = quantity;
    if (updateType === 'ajuste') {
        movementQuantity = quantity - originalQuantity;
    }

    try {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];

        if (typeof inventoryData.recordMovement !== 'function') {
            alert('Error interno: no se puede registrar el movimiento.');
            return;
        }

        await inventoryData.recordMovement({
            date: formattedDate,
            productId: parseInt(productId),
            productName: product.name,
            type: updateType,
            quantity: movementQuantity,
            reason,
        });

        if (updateType === 'entrada' && typeof window.registerReabastecerIfPendingFromAlert === 'function') {
            try {
                await window.registerReabastecerIfPendingFromAlert(
                    parseInt(productId, 10),
                    quantity,
                    reason,
                );
            } catch (e) {
                console.warn('Historial alerta reabastecer:', e);
            }
        }

        if (typeof closeModal === 'function') {
            closeModal(modal);
        } else {
            modal.style.display = 'none';
        }

        if (typeof displayInventoryUI === 'function') {
            await displayInventoryUI();
        }

        let mensajeExito = '';
        if (updateType === 'entrada') {
            mensajeExito = `Entrada de ${quantity} unidades registrada.`;
        } else if (updateType === 'salida') {
            mensajeExito = `Salida de ${quantity} unidades registrada.`;
        } else if (updateType === 'ajuste') {
            mensajeExito = `Ajuste de inventario realizado. Nuevo stock: ${quantity} unidades.`;
        }

        alert(`Inventario actualizado correctamente. ${mensajeExito}`);
    } catch (err) {
        console.error(err);
        alert(`No se pudo registrar el movimiento: ${err.message || err}`);
    }
}

// Inicializar los listeners del modal de actualización
function initUpdateInventoryModalListeners() {
    console.log("Inicializando listeners del modal de actualización de inventario");
    
    const updateInventoryForm = document.getElementById('updateInventoryForm');
    
    if (updateInventoryForm) {
        // Evitar duplicar listeners
        if (!updateInventoryForm.dataset.listenerAttached) {
            updateInventoryForm.addEventListener('submit', handleUpdateInventoryFormSubmit);
            updateInventoryForm.dataset.listenerAttached = 'true';
            console.log("Listener de envío de formulario de actualización adjuntado");
        } else {
            console.log("Listener de formulario de actualización ya adjuntado");
        }
    } else {
        console.error("Formulario de actualización de inventario no encontrado");
    }
}

// Exponer funciones globalmente
window.openUpdateInventoryModal = openUpdateInventoryModal;
window.initUpdateInventoryModalListeners = initUpdateInventoryModalListeners; 
