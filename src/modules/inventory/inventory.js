// Inventory module coordinator

// Alias the inventoryData module for convenience
const inventory = inventoryData;

// This function initializes all the event listeners and logic specific to the Product Page.
// It is called by the main app.js initialization.
function initInventory() {
    const canManageProducts = () =>
        typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && auth.canPerform('inventory.products.manage');
    const canManageMovements = () =>
        typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && auth.canPerform('inventory.movements.manage');
    const canCreateMovements = () =>
        typeof auth !== 'undefined' && typeof auth.canPerform === 'function' && auth.canPerform('inventory.movements.create');

    console.log("Initializing inventory functionality...");
    const productPage = document.getElementById('productPage');
    if (!productPage) {
        console.error("Product page element #productPage not found! Inventory module cannot fully initialize.");
        // Cannot initialize if the page element doesn't exist
        return;
    }

    // --- Initialize modal listeners from their dedicated files ---
    // This sets up form submissions and specific modal button logic *within* the modals.
    if (typeof initProductModalListeners === 'function') {
        initProductModalListeners();
        console.log("Product Modal listeners initialized.");
    } else {
        console.error("initProductModalListeners function not found.");
    }

    if (typeof initCsvModalListeners === 'function') {
        initCsvModalListeners();
        console.log("Import Data Modal listeners initialized.");
    } else {
        console.error("initCsvModalListeners function not found.");
    }

    if (typeof initUpdateInventoryModalListeners === 'function') {
        initUpdateInventoryModalListeners();
        console.log("Update Inventory Modal listeners initialized.");
    } else {
        console.error("initUpdateInventoryModalListeners function not found.");
    }

    // Note: General modal closing (X button, backdrop click) is handled by initModalUtils in app.js

    // --- Event listeners for the main buttons on the Product Page ---

    const addProductBtn = document.getElementById('addProductBtn');
    const updateInventoryBtn = document.getElementById('updateInventoryBtn');
    const deleteProductBtn = document.getElementById('deleteProductBtn');
    const importCsvBtn = document.getElementById('importCsvBtn');

    // Add Product Button
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            if (!canManageProducts()) {
                alert('No tienes permisos para agregar productos.');
                return;
            }
            console.log("Add Product button clicked.");
            // Call the modal opening function from inventory-modals.js (assumed global)
            if (typeof openAddProductModal === 'function') {
                openAddProductModal('add');
            } else {
                console.error("openAddProductModal function not found.");
                alert("Funcionalidad para agregar producto no disponible.");
            }
        });
    } else {
        console.error("Add product button #addProductBtn not found!");
    }

    // Update Inventory Button
    if (updateInventoryBtn) {
        updateInventoryBtn.addEventListener('click', () => {
            if (!(canManageMovements() || canCreateMovements())) {
                alert('No tienes permisos para actualizar inventario.');
                return;
            }
            console.log("Update Inventory button clicked.");
            // Llamar a la función para abrir el modal de actualización de inventario
            if (typeof openUpdateInventoryModal === 'function') {
                openUpdateInventoryModal();
            } else {
                console.error("openUpdateInventoryModal function not found.");
                alert("Funcionalidad de actualización de inventario no disponible.");
            }
        });
    } else {
        console.error("Update inventory button #updateInventoryBtn not found!");
    }

    // Delete Product Button
    if (deleteProductBtn) {
        deleteProductBtn.addEventListener('click', () => {
            if (!canManageProducts()) {
                alert('No tienes permisos para eliminar productos.');
                return;
            }
            console.log("Delete Product button clicked.");
            // Call the confirmation view function from inventory-modals.js (assumed global)
            if (typeof showDeleteProductConfirmation === 'function') {
                showDeleteProductConfirmation();
            } else {
                console.error("showDeleteProductConfirmation function not found.");
                alert("Funcionalidad para eliminar producto no disponible.");
            }
        });
    } else {
        console.error("Delete product button #deleteProductBtn not found!");
    }

    // Import CSV Button
    if (importCsvBtn) {
        importCsvBtn.addEventListener('click', () => {
            if (!canManageProducts()) {
                alert('No tienes permisos para importar productos.');
                return;
            }
            console.log("Import Data button clicked.");
            // Call the modal opening function from inventory-csv-modal.js
            if (typeof openImportCsvModal === 'function') {
                openImportCsvModal();
            } else {
                console.error("openImportCsvModal function not found.");
                alert("Funcionalidad para importar datos no disponible.");
            }
        });
    } else {
        console.error("Import Data button #importCsvBtn not found!");
    }

    // MutationObserver to detect when the product page becomes active
    // This ensures the inventory table is displayed whenever the user navigates TO this page.
    const observer = new MutationObserver((mutationsList) => {
        for(const mutation of mutationsList) {
            // Check if the class attribute changed on the productPage element
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const targetElement = mutation.target; // This should be #productPage

                // If the page became active
                if (targetElement.id === 'productPage' && targetElement.classList.contains('active')) {
                    console.log("Product page activated via MutationObserver.");
                    // Ensure the productContent area is cleared before displaying
                    const productContent = document.getElementById('productContent');
                    if(productContent) {
                        productContent.innerHTML = '<h2>Inventario</h2><p>Cargando inventario...</p>'; // Clear previous state/messages
                    }
                    // Call the UI display function from inventory-ui.js (assumed global)
                    if (typeof displayInventoryUI === 'function') {
                        displayInventoryUI();
                    } else {
                        console.error("displayInventoryUI function not found when page activated.");
                    }
                }
                // If the page became inactive
                else if (targetElement.id === 'productPage' && !targetElement.classList.contains('active')) {
                    console.log("Product page deactivated.");
                    // Call the UI clear function from inventory-ui.js (assumed global)
                    // Adding a check to ensure the function exists before calling
                    if (typeof clearInventoryDisplayUI === 'function') {
                        clearInventoryDisplayUI();
                    } else {
                        console.warn("clearInventoryDisplayUI function not found when page deactivated. UI might not be cleared.");
                    }
                }
            }
        }
    });

    // Start observing the product page element for class changes
    observer.observe(productPage, { attributes: true });

    console.log("Inventory initialization complete (initInventory function finished).");
}

// Make the initInventory function globally available so app.js can call it.
window.initInventory = initInventory;
