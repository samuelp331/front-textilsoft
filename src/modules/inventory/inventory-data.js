const inventoryData = (() => {
    const NOTIFICATION_STORAGE_KEY = 'textilsoft.notificationSettings.v1';

    let products = [];
    let inventoryMovements = [];
    let ubicaciones = [];
    let notificationSettings = {
        email: { enabled: false, address: '' },
        inApp: { enabled: true },
        desktop: { enabled: false },
    };

    function loadNotificationSettingsFromStorage() {
        try {
            const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return;
            notificationSettings = {
                email: {
                    enabled: Boolean(parsed.email?.enabled),
                    address: typeof parsed.email?.address === 'string' ? parsed.email.address : '',
                },
                inApp: { enabled: parsed.inApp?.enabled !== false },
                desktop: { enabled: Boolean(parsed.desktop?.enabled) },
            };
        } catch (_) {
            /* valores por defecto */
        }
    }

    function persistNotificationSettings() {
        try {
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationSettings));
        } catch (_) {
            /* modo privado o cuota agotada */
        }
    }

    loadNotificationSettingsFromStorage();

    const mapProductFromApi = (item) => ({
        id: item.id,
        code: item.codigo,
        name: item.nombre,
        category: item.categoria,
        description: item.descripcion || '',
        quantity: Number(item.cantidad ?? 0),
        minQuantity: Number(item.cantidad_minima ?? 0),
        price: Number(item.precio || 0),
        unit: item.unidad,
        expirationDate: item.fecha_vencimiento || '',
        notifyDaysBefore: Number(item.dias_preaviso_vencimiento ?? 30),
        ubicacionId: item.ubicacion,
        ubicacionDetalle: item.ubicacion_detalle,
    });

    const mapProductToApi = (item) => ({
        codigo: item.code,
        nombre: item.name,
        categoria: item.category,
        ubicacion: item.ubicacionId || null,
        descripcion: item.description || '',
        cantidad: Number(item.quantity ?? 0),
        cantidad_minima: Number(item.minQuantity ?? 0),
        precio: Number(item.price ?? 0),
        unidad: item.unit || 'unidad',
        fecha_vencimiento: item.expirationDate || null,
        dias_preaviso_vencimiento: Number(item.notifyDaysBefore ?? 30),
    });

    const mapMovementFromApi = (item) => ({
        id: item.id,
        date: item.fecha,
        productId: item.producto,
        productName: item.producto_nombre,
        type: item.tipo,
        quantity: item.cantidad,
        reason: item.motivo,
        registeredById: item.registrado_por ?? null,
        registeredByName: item.registrado_por_nombre ?? null,
    });

    async function loadProducts(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.categoria) params.set('categoria', filters.categoria);
        if (filters.ubicacion_id) params.set('ubicacion_id', filters.ubicacion_id);
        if (filters.pasillo) params.set('pasillo', filters.pasillo);
        const query = params.toString() ? `?${params.toString()}` : '';
        const data = await apiClient.get(`/inventory/productos/${query}`);
        products = Array.isArray(data) ? data.map(mapProductFromApi) : [];
        return getProducts();
    }

    async function loadUbicaciones() {
        const data = await apiClient.get('/inventory/ubicaciones/');
        ubicaciones = Array.isArray(data) ? data : [];
        return ubicaciones;
    }

    async function getCategorias() {
        const data = await apiClient.get('/inventory/productos/categorias/');
        return Array.isArray(data) ? data : [];
    }

    function getProducts() {
        return [...products];
    }

    function getProductById(id) {
        return products.find((item) => Number(item.id) === Number(id));
    }

    async function addProduct(product) {
        const payload = mapProductToApi(product);
        const created = await apiClient.post('/inventory/productos/', payload);
        const mapped = mapProductFromApi(created);
        products.push(mapped);
        return mapped;
    }

    async function updateProduct(id, updatedData) {
        const current = getProductById(id);
        if (!current) return false;

        const payload = mapProductToApi({ ...current, ...updatedData });
        const updated = await apiClient.put(`/inventory/productos/${id}/`, payload);
        const mapped = mapProductFromApi(updated);
        const index = products.findIndex((item) => Number(item.id) === Number(id));
        if (index !== -1) products[index] = mapped;
        return true;
    }

    async function deleteProduct(id) {
        await apiClient.delete(`/inventory/productos/${id}/`);
        products = products.filter((item) => Number(item.id) !== Number(id));
        return true;
    }

    async function recordMovement(movement) {
        const payload = {
            producto: Number(movement.productId),
            fecha: movement.date,
            tipo: movement.type,
            cantidad: Number(movement.quantity),
            motivo: movement.reason,
        };
        const created = await apiClient.post('/inventory/movimientos/', payload);
        inventoryMovements.unshift(mapMovementFromApi(created));
        return true;
    }

    async function getInventoryMovements(filters = {}) {
        const params = new URLSearchParams();
        if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
        if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
        if (filters.producto_id) params.set('producto_id', filters.producto_id);
        if (filters.tipo) params.set('tipo', filters.tipo);
        const query = params.toString() ? `?${params.toString()}` : '';
        const data = await apiClient.get(`/inventory/movimientos/${query}`);
        inventoryMovements = Array.isArray(data) ? data.map(mapMovementFromApi) : [];
        return [...inventoryMovements];
    }

    function getNotificationSettings() {
        return { ...notificationSettings };
    }

    function updateNotificationSettings(settings) {
        if (!settings || typeof settings !== 'object') return false;
        if (settings.email) {
            notificationSettings.email = {
                ...notificationSettings.email,
                ...settings.email,
            };
        }
        if (settings.inApp) {
            notificationSettings.inApp = {
                ...notificationSettings.inApp,
                ...settings.inApp,
            };
        }
        if (settings.desktop) {
            notificationSettings.desktop = {
                ...notificationSettings.desktop,
                ...settings.desktop,
            };
        }
        persistNotificationSettings();
        return true;
    }

    async function checkInventoryAlerts() {
        const data = await apiClient.get('/alerts/');
        return Array.isArray(data)
            ? data.map((item) => ({
                type: item.type,
                productId: item.product_id,
                productName: item.product_name,
                current: item.current,
                minimum: item.minimum,
                daysLeft: item.days_left,
                daysOverdue: item.days_overdue,
                expirationDate: item.expiration_date,
                ubicacion: item.ubicacion || '',
            }))
            : [];
    }

    return {
        loadProducts,
        loadUbicaciones,
        getProducts,
        getUbicaciones: () => [...ubicaciones],
        getProductById,
        addProduct,
        updateProduct,
        deleteProduct,
        getCategorias,
        getNotificationSettings,
        updateNotificationSettings,
        checkInventoryAlerts,
        recordMovement,
        getInventoryMovements,
    };
})();
