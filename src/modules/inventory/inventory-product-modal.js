// Inventory Add/Edit Product Modal Module

// This module handles the logic for the Add/Edit Product modal dialog.
// It interacts with inventoryData for saving/updating and inventory-ui for refreshing the display.
// It relies on modal-utils.js for basic modal closing.

// Function to open the Add/Edit Product modal
async function openAddProductModal(mode = 'add', productId = null) {
    const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.products.manage');
    if (!canManageProducts) {
        alert('No tienes permisos para gestionar productos.');
        return;
    }

    console.log(`Attempting to open Add/Edit Product modal in ${mode} mode for ID: ${productId}`);
    const modal = document.getElementById('addProductModal');
    const form = document.getElementById('addProductForm');
    const modalTitle = modal ? modal.querySelector('h2') : null;

    // Get references to all form fields
    const codeInput = document.getElementById('productCode');
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const ubicacionSelect = document.getElementById('productUbicacion');
    const descInput = document.getElementById('productDescription');
    const quantityInput = document.getElementById('productQuantity');
    const minQuantityInput = document.getElementById('productMinQuantity');
    const priceInput = document.getElementById('productPrice');
    const unitSelect = document.getElementById('productUnit');
    const expirationDateInput = document.getElementById('productExpirationDate');
    const notifyDaysBeforeInput = document.getElementById('productNotifyDaysBefore');

    if (!modal || !form || !codeInput || !nameInput || !categoryInput || !descInput ||
        !quantityInput || !minQuantityInput || !priceInput || !unitSelect ||
        !expirationDateInput || !notifyDaysBeforeInput || !modalTitle) {
        console.error("One or more Add/Edit Product modal elements not found.");
        alert("Error interno: No se pudo abrir el formulario.");
        return;
    }

    form.reset(); // Clear previous entries

    // Load ubicaciones for the dropdown
    if (typeof inventoryData !== 'undefined' && typeof inventoryData.loadUbicaciones === 'function') {
        const ubicaciones = await inventoryData.loadUbicaciones();
        ubicacionSelect.innerHTML = '<option value="">Seleccione Ubicación (Opcional)</option>';
        ubicaciones.forEach(ub => {
            const option = document.createElement('option');
            option.value = ub.id;
            option.textContent = `Pasillo ${ub.pasillo} - Estante ${ub.estante} - Sección ${ub.seccion}`;
            ubicacionSelect.appendChild(option);
        });
    }

    if (mode === 'edit' && productId !== null) {
        // Ensure inventoryData is available
        if (typeof inventoryData === 'undefined' || typeof inventoryData.getProductById !== 'function') {
            console.error("Inventory data module or getProductById function not found.");
            alert("Error interno: No se pudieron cargar los datos del producto para editar.");
            closeModal(modal); // Attempt to close modal on error
            return;
        }

        const product = inventoryData.getProductById(productId); // Get data using the data module
        if (!product) {
            console.error("Product not found for editing:", productId);
            alert("No se pudo encontrar el producto para editar.");
            closeModal(modal); // Attempt to close modal if product not found
            return;
        }

        // Fill the form with product data
        codeInput.value = product.code || '';
        nameInput.value = product.name || '';
        categoryInput.value = product.category || '';
        descInput.value = product.description || '';
        quantityInput.value = product.quantity || 0;
        minQuantityInput.value = product.minQuantity || 0;
        priceInput.value = product.price || 0;
        unitSelect.value = product.unit || 'unidad'; // Select the correct unit option

        // Set ubicacion if product has one
        if (product.ubicacionId) {
            ubicacionSelect.value = product.ubicacionId;
        }

        // Set expiration date if exists
        if (product.expirationDate) {
            expirationDateInput.value = product.expirationDate;
        }

        // Set notify days before
        notifyDaysBeforeInput.value = product.notifyDaysBefore || 30;

        // Set form mode and ID for handling the submission as an update
        form.dataset.mode = 'edit';
        form.dataset.editId = productId;
        modalTitle.textContent = 'Editar Producto';
        console.log("Modal ready in EDIT mode for ID:", productId, product);
    } else {
        // Set form mode for adding
        form.dataset.mode = 'add';
        delete form.dataset.editId; // Remove any previous edit ID
        modalTitle.textContent = 'Agregar Producto';

        // Set default values for new products
        minQuantityInput.value = 10; // Default min quantity
        notifyDaysBeforeInput.value = 30; // Default notification days

        console.log("Modal ready in ADD mode.");
    }

    modal.style.display = 'block'; // Open the modal
}

// Function to handle the Add/Edit Product form submission
async function handleAddProductFormSubmit(event) {
    event.preventDefault();
    const canManageProducts = typeof auth !== 'undefined' && typeof auth.canPerform === 'function'
        && auth.canPerform('inventory.products.manage');
    if (!canManageProducts) {
        alert('No tienes permisos para guardar productos.');
        return;
    }

    console.log("Add/Edit Product form submitted.");
    const form = event.target;
    const modal = document.getElementById('addProductModal');

    // Get values from form fields
    const code = document.getElementById('productCode')?.value.trim();
    const name = document.getElementById('productName')?.value.trim();
    const category = document.getElementById('productCategory')?.value.trim();
    const ubicacionId = document.getElementById('productUbicacion')?.value || null;
    const description = document.getElementById('productDescription')?.value.trim();
    const quantityStr = document.getElementById('productQuantity')?.value;
    const minQuantityStr = document.getElementById('productMinQuantity')?.value;
    const priceStr = document.getElementById('productPrice')?.value;
    const unit = document.getElementById('productUnit')?.value;
    const expirationDate = document.getElementById('productExpirationDate')?.value;
    const notifyDaysBeforeStr = document.getElementById('productNotifyDaysBefore')?.value;

    // Basic validation (ensure code, name, category, quantity, price, unit are present)
    if (!code) {
        alert('Por favor ingrese un código de producto.');
        return;
    }
    
    if (!name) {
        alert('Por favor ingrese un nombre de producto.');
        return;
    }
    
    if (!category) {
        alert('Por favor ingrese una categoría para el producto.');
        return;
    }
    
    if (!quantityStr || !minQuantityStr || !priceStr || !unit) {
        alert('Por favor complete todos los campos requeridos.');
        return;
    }

    const quantity = parseInt(quantityStr);
    const minQuantity = parseInt(minQuantityStr);
    const price = parseFloat(priceStr);
    const notifyDaysBefore = parseInt(notifyDaysBeforeStr) || 30;

    if (isNaN(quantity) || quantity < 0) {
        alert('Por favor ingrese una cantidad válida (número positivo o cero).');
        return;
    }
    
    if (isNaN(minQuantity) || minQuantity < 0) {
        alert('Por favor ingrese una cantidad mínima válida (número positivo o cero).');
        return;
    }
    
    if (isNaN(price) || price < 0) {
        alert('Por favor ingrese un precio válido (número positivo o cero).');
        return;
    }
    
    // Check if the selected unit is one of the allowed values
    if (!['unidad', 'metro', 'rollo'].includes(unit.toLowerCase())) {
        alert('Por favor seleccione una unidad válida.');
        return;
    }


    // Prepare the product data object
    const productData = {
        code: code,
        name: name,
        category: category,
        ubicacionId: ubicacionId ? parseInt(ubicacionId) : null,
        description: description,
        quantity: quantity,
        minQuantity: minQuantity,
        price: price,
        unit: unit.toLowerCase(),
        expirationDate: expirationDate || '',
        notifyDaysBefore: notifyDaysBefore
    };


    // Ensure inventoryData and displayInventoryUI are available
    if (typeof inventoryData === 'undefined' || typeof inventoryData.addProduct !== 'function' || typeof inventoryData.updateProduct !== 'function') {
        console.error("Inventory data module or its functions (addProduct, updateProduct) not found.");
        alert("Error interno: No se pudo procesar el inventario.");
        return;
    }
     if (typeof displayInventoryUI === 'undefined') {
         console.error("displayInventoryUI function not found. Cannot refresh UI after save.");
     }


    try {
        let success = false;
        let message = '';

        if (form.dataset.mode === 'edit') {
            const id = parseInt(form.dataset.editId);
            if (isNaN(id)) {
                console.error("Invalid product ID for update:", form.dataset.editId);
                throw new Error("ID de producto inválido para actualizar.");
            }
            // Call the update function from the data module
            success = await inventoryData.updateProduct(id, productData);
            message = success ? 'Producto actualizado correctamente.' : 'No se pudo encontrar el producto para actualizar.';
             console.log(`Product ID ${id} update attempt: ${success ? 'Successful' : 'Failed'}`);
        } else { // mode === 'add'
            // Call the add function from the data module
            const newProduct = await inventoryData.addProduct(productData);
            success = !!newProduct; // Check if addProduct returned a product object
            message = success ? `Producto '${newProduct.name}' añadido correctamente con ID ${newProduct.id}.` : 'Hubo un error al añadir el producto.';
            console.log(`Product add attempt: ${success ? 'Successful' : 'Failed'}`, success ? newProduct : null);
        }

        alert(message); // Give feedback to the user

        if (success) {
            // Close the modal using the utility function
            if (typeof closeModal === 'function') {
                closeModal(modal);
            } else {
                modal.style.display = 'none'; // Fallback close if utility not found
                console.warn("closeModal utility function not found.");
            }

            form.reset(); // Clear the form

            // Refresh the inventory display
            if (typeof displayInventoryUI === 'function') {
                await displayInventoryUI();
            } else {
                console.warn("displayInventoryUI function not found. Cannot refresh inventory display automatically.");
            }
            
            // Actualizar alertas si se modificaron datos que afectan las alertas
            if (typeof alerts !== 'undefined' && typeof alerts.refreshAlerts === 'function') {
                await alerts.refreshAlerts();
            }
        }

    } catch (err) {
        console.error("Error handling product form submission:", err);
        alert(`Hubo un error al procesar el producto: ${err.message || 'Error desconocido'}. Por favor intente nuevamente.`);
    }
}

// Initialization function for Add/Edit Product Modal listeners
function initProductModalListeners() {
    console.log("Initializing Add/Edit Product Modal listeners...");
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        // Remove existing listener before adding to prevent duplicates if init is called multiple times
        // Using a data attribute to track listener state is a simple way.
        // A more robust way involves cloning/replacing or using removeEventListener with the exact handler reference.
        // For this demo, let's just add, assuming init runs once or duplicates are acceptable for this form.
        // addProductForm.removeEventListener('submit', handleAddProductFormSubmit); // Need reference to remove
         addProductForm.addEventListener('submit', handleAddProductFormSubmit);
         console.log("Add Product Form submit listener attached.");
    } else {
        console.error("Add Product Form not found for listener attachment (#addProductForm).");
    }
     console.log("Add/Edit Product Modal listeners initialized.");
}

// Expose functions globally
window.openAddProductModal = openAddProductModal;
window.initProductModalListeners = initProductModalListeners;
