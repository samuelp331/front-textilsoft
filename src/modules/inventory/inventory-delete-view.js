// Inventory Delete Confirmation View Module

// This module handles the specific UI view for confirming product deletion
// within the #productContent area, not a modal.
// It interacts with inventoryData for actual deletion and inventory-ui for refreshing the display.

// Function to show the delete product confirmation view within productContent
async function showDeleteProductConfirmation() {
    const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.products.manage');
    if (!canManageProducts) {
        alert('No tienes permisos para eliminar productos.');
        return;
    }

    const productContent = document.getElementById('productContent');
    if (!productContent) {
        console.error("productContent element not found for delete confirmation.");
        return;
    }

    // Ensure inventoryData is available
    if (typeof inventoryData === 'undefined' || typeof inventoryData.getProducts !== 'function') {
        console.error("Inventory data module or getProducts function not found for delete confirmation.");
        productContent.innerHTML = '<h2>Eliminar Productos</h2><p>Error al cargar la lista de productos.</p>';
        return;
    }

    await inventoryData.loadProducts();
    const products = inventoryData.getProducts();
    if (products.length === 0) {
        alert('No hay productos en el inventario para eliminar.');
        // Restore the default view
        if (typeof displayInventoryUI === 'function') {
            await displayInventoryUI();
        } else {
            // Fallback if displayInventoryUI is not available
            productContent.innerHTML = '<h2>Inventario</h2><p>No hay productos en el inventario.</p>';
        }
        return;
    }

    console.log("Showing delete product confirmation view.");

    let deleteHTML = `
        <h2>Eliminar Productos</h2>
        <p>Seleccione los productos que desea eliminar:</p>
        <div class="delete-product-list">
    `;

    products.forEach(item => {
        // Display ID, Code, Name, Category, Quantity, Unit for selection
        deleteHTML += `
            <div class="delete-product-item">
                <input type="checkbox" id="delete-${item.id}" data-id="${item.id}">
                <label for="delete-${item.id}">ID: ${item.id} | ${item.code || ''} - ${item.name} (${item.category || ''}) - Cantidad: ${item.quantity} ${item.unit || ''}</label>
            </div>
        `;
    });

    deleteHTML += `
        </div>
        <div class="delete-buttons" style="margin-top: 15px;">
            <button id="confirmDeleteBtn" class="confirm-delete-btn">Eliminar Seleccionados</button>
            <button id="cancelDeleteBtn" class="cancel-delete-btn">Cancelar</button>
        </div>
    `;

    productContent.innerHTML = deleteHTML;

    // Attach listeners to the new buttons using delegation on productContent for robustness
    // Avoids needing to remove/re-add listeners manually for each button render.
    const productContentElement = document.getElementById('productContent');
    if (productContentElement && !productContentElement.dataset.deleteListenersAttached) {
         productContentElement.addEventListener('click', (e) => {
             const target = e.target;
             if (target.id === 'confirmDeleteBtn') {
                 console.log("Confirm Delete button clicked.");
                 handleConfirmDeleteSelected();
             } else if (target.id === 'cancelDeleteBtn') {
                 console.log("Cancel Delete button clicked.");
                 // Ensure displayInventoryUI is available and refresh the UI
                 if (typeof displayInventoryUI === 'function') {
                     displayInventoryUI();
                 } else {
                     console.warn("displayInventoryUI function not found. Cannot refresh inventory display automatically after cancel.");
                      // Fallback clear
                      productContentElement.innerHTML = '<h2>Inventario</h2><p>Opciones para gestionar inventario.</p>';
                 }
             }
         });
        productContentElement.dataset.deleteListenersAttached = 'true'; // Mark listener as attached
        console.log("Delete confirmation buttons listener attached to productContent.");
    } else if (!productContentElement) {
        console.error("productContent element not found for attaching delete button listener.");
    } else {
        console.log("Delete confirmation buttons listener already attached.");
    }

    console.log("Delete confirmation view rendered."); // Listeners are attached via delegation
}

// Function to handle the confirmation and perform deletion
async function handleConfirmDeleteSelected() {
    const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.products.manage');
    if (!canManageProducts) {
        alert('No tienes permisos para eliminar productos.');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.delete-product-item input[type="checkbox"]:checked');
    if (selectedCheckboxes.length === 0) {
        alert('Por favor seleccione al menos un producto para eliminar.');
        return;
    }

    if (confirm(`¿Está seguro que desea eliminar ${selectedCheckboxes.length} producto(s)?`)) {
        const idsToDelete = Array.from(selectedCheckboxes)
            .map(cb => parseInt(cb.dataset.id))
            .filter(id => !isNaN(id)); // Ensure IDs are valid numbers

        let deletedCount = 0;
        // Ensure inventoryData is available before calling delete
        if (typeof inventoryData === 'undefined' || typeof inventoryData.deleteProduct !== 'function') {
             console.error("Inventory data module or deleteProduct function not found for confirmation delete.");
             alert("Error interno al intentar eliminar.");
             return;
        }

        for (const id of idsToDelete) {
            if (await inventoryData.deleteProduct(id)) {
                deletedCount++;
            } else {
                console.warn(`Failed to delete product with ID ${id} (deleteProduct returned false).`);
            }
        }

        alert(`Se eliminaron ${deletedCount} producto(s) correctamente.`);
        // Ensure displayInventoryUI is available and refresh the UI
        if (typeof displayInventoryUI === 'function') {
            await displayInventoryUI();
        } else {
            console.warn("displayInventoryUI function not found. Cannot refresh inventory display automatically after deletion.");
             // Fallback clear or message
             const productContent = document.getElementById('productContent');
             if (productContent) {
                 productContent.innerHTML = '<h2>Inventario</h2><p>Opciones para gestionar inventario.</p>';
             }
        }
    }
}

// Expose functions globally that are needed by inventory.js
window.showDeleteProductConfirmation = showDeleteProductConfirmation;
