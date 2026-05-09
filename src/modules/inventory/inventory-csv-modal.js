function openImportCsvModal() {
    const modal = document.getElementById('importCsvModal');
    const fileInput = document.getElementById('csvFile');
    if (!modal || !fileInput) {
        alert('Error interno: no se pudo abrir importacion.');
        return;
    }
    fileInput.value = '';
    modal.style.display = 'block';
}

function handleImportCsvProcess() {
    const modal = document.getElementById('importCsvModal');
    const fileInput = document.getElementById('csvFile');
    if (!fileInput || !modal) {
        alert('Error interno: elementos de importacion no encontrados.');
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Por favor, seleccione un archivo CSV.');
        return;
    }

    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
        alert('Seleccione un archivo con extension .csv');
        return;
    }

    if (typeof inventoryData === 'undefined' || typeof inventoryData.addProduct !== 'function') {
        alert('Error interno: modulo de inventario no disponible.');
        return;
    }

    alert('Procesando archivo CSV...');
    processCsvFile(file, modal);
}

function processCsvFile(file, modal) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const csvData = e.target.result;
            const rows = csvData.split('\n').filter((row) => row.trim() !== '');
            await processDataRows(rows, modal);
        } catch (err) {
            alert(`Error al procesar CSV: ${err.message}`);
            if (typeof closeModal === 'function') closeModal(modal);
        }
    };
    reader.onerror = () => {
        alert('Error al leer el archivo CSV.');
        if (typeof closeModal === 'function') closeModal(modal);
    };
    reader.readAsText(file);
}

async function processDataRows(rows, modal) {
    let added = 0;
    let processed = 0;

    if (!rows.length) {
        alert('El archivo no contiene datos.');
        if (typeof closeModal === 'function') closeModal(modal);
        return;
    }

    const header = rows[0].toLowerCase().split(',').map((h) => h.trim());
    const required = ['codigo', 'nombre', 'categoria', 'descripcion', 'cantidad', 'precio', 'unidad'];
    const hasHeader = required.some((r) => header.includes(r));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    for (const row of dataRows) {
        const cols = row.split(',').map((c) => c.trim());
        if (cols.length < 7) continue;

        const categoryRaw = cols[2];
        const category = categoryRaw ? categoryRaw.replace(/\s+/g, ' ').trim() : '';

        const product = {
            code: cols[0],
            name: cols[1],
            category,
            description: cols[3],
            quantity: parseInt(cols[4], 10),
            price: parseFloat(cols[5]),
            unit: cols[6].toLowerCase(),
        };

        if (!product.code || !product.name || !product.category) continue;
        if (Number.isNaN(product.quantity) || product.quantity < 0) continue;
        if (Number.isNaN(product.price) || product.price < 0) continue;
        if (!['unidad', 'metro', 'rollo'].includes(product.unit)) continue;

        const created = await inventoryData.addProduct(product);
        if (created) {
            added += 1;
        }
        processed += 1;
    }

    alert(`Importacion completada. Se agregaron ${added} de ${processed} filas procesadas.`);
    if (typeof displayInventoryUI === 'function') {
        await displayInventoryUI();
    }
    if (typeof closeModal === 'function') closeModal(modal);
}

function initCsvModalListeners() {
    const processCsvBtn = document.getElementById('processCsvBtn');
    if (!processCsvBtn) return;
    if (!processCsvBtn.dataset.listenerAttached) {
        processCsvBtn.addEventListener('click', handleImportCsvProcess);
        processCsvBtn.dataset.listenerAttached = 'true';
    }
}

window.openImportCsvModal = openImportCsvModal;
window.initCsvModalListeners = initCsvModalListeners;
