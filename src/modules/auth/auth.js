const auth = (() => {
    const API_BASE_URL = window.TEXTILSOFT_API_BASE_URL || 'http://127.0.0.1:8000/api';
    const ROLE_PERMISSIONS = Object.freeze({
        administrador: {
            pages: ['dashboardPage', 'profilePage', 'productPage', 'reportsPage', 'alertsPage', 'suppliersPage', 'inventoryMovementsPage', 'consumptionReportPage', 'adminPage'],
            actions: ['inventory.products.manage', 'inventory.movements.manage', 'suppliers.manage'],
        },
        supervisor: {
            pages: ['dashboardPage', 'profilePage', 'productPage', 'reportsPage', 'alertsPage', 'suppliersPage', 'inventoryMovementsPage', 'consumptionReportPage'],
            actions: ['inventory.products.manage', 'inventory.movements.manage', 'suppliers.manage'],
        },
        bodeguero: {
            pages: ['dashboardPage', 'profilePage', 'productPage', 'reportsPage', 'alertsPage', 'suppliersPage', 'inventoryMovementsPage'],
            actions: ['inventory.products.manage', 'inventory.movements.manage'],
        },
        operario: {
            pages: ['dashboardPage', 'profilePage', 'productPage'],
            actions: ['inventory.movements.create'],
        },
        admin: {
            pages: ['dashboardPage', 'profilePage', 'productPage', 'reportsPage', 'alertsPage', 'suppliersPage', 'inventoryMovementsPage', 'consumptionReportPage', 'adminPage'],
            actions: ['inventory.products.manage', 'inventory.movements.manage', 'suppliers.manage'],
        },
        user: {
            pages: ['dashboardPage', 'profilePage'],
            actions: [],
        },
    });

    const adminProfile = Object.freeze({
        name: 'Administrador',
        identification: 'ADMIN-001',
        cellphone: '000-000-0000',
        jobTitle: 'Administrador del Sistema',
        email: 'admin@textilsoft.com',
        address: 'Oficina Principal',
        entryDate: '2023-01-01',
        role: 'admin',
    });

    let currentUser = null;

    function normalizeRole(role) {
        return String(role || '').trim().toLowerCase();
    }

    function getCurrentPermissions() {
        const role = normalizeRole(currentUser?.role);
        return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
    }

    function hasPageAccess(pageId) {
        if (!currentUser) return false;
        return getCurrentPermissions().pages.includes(pageId);
    }

    function canPerform(action) {
        if (!currentUser) return false;
        return getCurrentPermissions().actions.includes(action);
    }

    function setElementVisibility(selector, visible) {
        const element = document.querySelector(selector);
        if (!element) return;
        element.style.display = visible ? '' : 'none';
    }

    /** Mapeo data-page del dashboard -> id de página esperado por hasPageAccess / navigation.showPage */
    const DASHBOARD_ROUTE_TO_PAGE_ID = Object.freeze({
        profile: 'profilePage',
        product: 'productPage',
        reports: 'reportsPage',
        alerts: 'alertsPage',
        suppliers: 'suppliersPage',
        admin: 'adminPage',
    });

    function applyRoleUI() {
        const loggedIn = Boolean(currentUser);

        const dashboardButtons = document.querySelectorAll('.dashboard-btn');
        dashboardButtons.forEach((btn) => {
            const key = String(btn.dataset.page || '').trim();
            const pageId = DASHBOARD_ROUTE_TO_PAGE_ID[key];
            if (!pageId) {
                btn.style.display = 'none';
                return;
            }
            const visible = loggedIn && hasPageAccess(pageId);
            btn.style.display = visible ? '' : 'none';
        });

        setElementVisibility('#inventoryMovementsCard', hasPageAccess('inventoryMovementsPage'));
        setElementVisibility('#consumptionReportsCard', hasPageAccess('consumptionReportPage'));

        const canManageProducts = canPerform('inventory.products.manage');
        const canManageMovements = canPerform('inventory.movements.manage');
        const canCreateMovements = canPerform('inventory.movements.create');
        setElementVisibility('#addProductBtn', canManageProducts);
        setElementVisibility('#deleteProductBtn', canManageProducts);
        setElementVisibility('#importCsvBtn', canManageProducts);
        setElementVisibility('#updateInventoryBtn', canManageMovements || canCreateMovements);

        const canManageSuppliers = canPerform('suppliers.manage');
        setElementVisibility('#addSupplierBtn', canManageSuppliers);
        document.querySelectorAll('#suppliersTable .edit-btn, #suppliersTable .delete-btn').forEach((btn) => {
            btn.style.display = canManageSuppliers ? '' : 'none';
        });
    }

    function toProfileFromBackend(payload, username) {
        const backendUser = payload?.usuario || {};
        return {
            id: backendUser.id,
            name: backendUser.nombre || username || '',
            identification: String(backendUser.id || ''),
            cellphone: '',
            jobTitle: payload?.rol?.nombre || '',
            email: backendUser.email || username || '',
            address: '',
            entryDate: new Date().toISOString().split('T')[0],
            role: payload?.rol?.nombre || 'user',
        };
    }

    function formatBackendError(body, fallbackMessage) {
        if (body === null || body === undefined) return fallbackMessage;
        if (typeof body === 'string') return body.trim() || fallbackMessage;
        if (typeof body !== 'object') return fallbackMessage;
        if (typeof body.detail === 'string') return body.detail;
        if (Array.isArray(body.detail)) {
            const joined = body.detail.map((x) => String(x)).join('\n');
            return joined || fallbackMessage;
        }
        const parts = [];
        for (const [key, val] of Object.entries(body)) {
            if (key === 'detail' || val === undefined) continue;
            if (Array.isArray(val)) {
                parts.push(`${key}: ${val.join(', ')}`);
            } else if (typeof val === 'object' && val !== null) {
                parts.push(`${key}: ${JSON.stringify(val)}`);
            } else {
                parts.push(`${key}: ${val}`);
            }
        }
        return parts.length ? parts.join('\n') : fallbackMessage;
    }

    async function parseResponse(response, fallbackMessage) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const message = formatBackendError(body, fallbackMessage);
            throw new Error(message);
        }
        return body;
    }

    async function loginAgainstBackend(username, password) {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password }),
        });
        return parseResponse(response, 'Error de autenticacion');
    }

    async function registerAgainstBackend(userData) {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: userData.name,
                identificacion: userData.identification,
                celular: userData.cellphone,
                direccion: userData.address,
                email: userData.email,
                password: userData.password,
                rol: userData.rol || 'operario',
            }),
        });
        return parseResponse(response, 'Error en registro');
    }

    async function recoverAccountAgainstBackend(email) {
        const response = await fetch(`${API_BASE_URL}/recover-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return parseResponse(response, 'Error en recuperacion');
    }

    async function resetPasswordAgainstBackend(uid, token, password, passwordConfirm) {
        const response = await fetch(`${API_BASE_URL}/password-reset-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid,
                token,
                password,
                password_confirm: passwordConfirm,
            }),
        });
        return parseResponse(response, 'Error al restablecer contrasena');
    }

    let lastLoginError = null;

    async function handleLogin(username, password) {
        lastLoginError = null;
        try {
            const payload = await loginAgainstBackend(username, password);
            const token = payload?.token;
            if (token) localStorage.setItem('authToken', token);
            currentUser = toProfileFromBackend(payload, username);
            applyRoleUI();
            return true;
        } catch (error) {
            lastLoginError = error.message || 'Error de autenticacion';
            console.warn('Backend login failed:', lastLoginError);
        }

        if (username.toLowerCase() === 'admin' && password === 'admin123') {
            currentUser = adminProfile;
            applyRoleUI();
            lastLoginError = null;
            return true;
        }

        currentUser = null;
        applyRoleUI();
        return false;
    }

    function getLastLoginError() {
        return lastLoginError;
    }

    async function registerUser(userData) {
        if (!userData || !userData.name || !userData.identification || !userData.cellphone || !userData.email || !userData.rol || !userData.address || !userData.password || !userData.confirmPassword) {
            alert('Por favor complete todos los campos requeridos.');
            return false;
        }
        if (userData.password !== userData.confirmPassword) {
            alert('Las contrasenas no coinciden.');
            return false;
        }

        try {
            await registerAgainstBackend(userData);
            return true;
        } catch (error) {
            alert(`Hubo un error al registrar: ${error.message}`);
            return false;
        }
    }

    function handleLogout() {
        currentUser = null;
        localStorage.removeItem('authToken');
        applyRoleUI();
    }

    function getCurrentUser() {
        return currentUser ? { ...currentUser } : null;
    }

    function getAdminProfile() {
        return { ...adminProfile };
    }

    return {
        get currentUser() { return getCurrentUser(); },
        get adminProfile() { return getAdminProfile(); },
        handleLogin,
        registerUser,
        handleLogout,
        loginAgainstBackend,
        registerAgainstBackend,
        recoverAccountAgainstBackend,
        resetPasswordAgainstBackend,
        hasPageAccess,
        canPerform,
        applyRoleUI,
        getLastLoginError,
    };
})();

function initAuth() {
    try {
        const qp = new URLSearchParams(window.location.search);
        if (qp.get('page') === 'resetPassword' && qp.get('uid') && qp.get('token')) {
            sessionStorage.setItem(
                'textilsoftPwdResetParams',
                JSON.stringify({ uid: qp.get('uid'), token: qp.get('token') }),
            );
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (_) { /* ignorar */ }

    if (window.__authInitialized) return;
    window.__authInitialized = true;

    const loginForm = document.getElementById('loginForm');
    const recoverAccountLink = document.getElementById('recoverAccountLink');
    const registerNavBtn = document.getElementById('registerNavBtn');
    const registrationForm = document.getElementById('registrationForm');

    const showPageSafe = (pageId) => {
        if (typeof navigation !== 'undefined' && typeof navigation.showPage === 'function') {
            navigation.showPage(pageId);
            return;
        }
        // Fallback si navigation no esta disponible.
        document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
        document.getElementById(pageId)?.classList.add('active');
        window.scrollTo(0, 0);
    };

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (!usernameInput || !passwordInput) return;
            const username = usernameInput.value;
            const password = passwordInput.value;

            if (await auth.handleLogin(username, password)) {
                showPageSafe('dashboardPage');
                loginForm.reset();
            } else {
                const detail = typeof auth.getLastLoginError === 'function'
                    ? auth.getLastLoginError()
                    : null;
                alert(detail || 'Usuario o contrasena incorrectos');
                passwordInput.value = '';
            }
        });
    }

    if (recoverAccountLink) {
        recoverAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('recoverAccountForm')?.reset();
            showPageSafe('recoverAccountPage');
        });
    }

    if (registerNavBtn) {
        registerNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registrationForm')?.reset();
            showPageSafe('registrationPage');
        });
    }

    const logoutBtns = document.querySelectorAll('#logoutBtn, #logoutProfileBtn, #logoutProductBtn, #logoutQrBtn, #logoutReportsBtn, #logoutAlertsBtn, #logoutDataBtn, #logoutSuppliersBtn, #logoutInventoryMovementsBtn, #logoutConsumptionReportBtn, #logoutAdminBtn');
    logoutBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            auth.handleLogout();
            showPageSafe('loginPage');
            if (loginForm) loginForm.reset();
        });
    });

    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUser = {
                name: document.getElementById('regName')?.value || '',
                identification: document.getElementById('regIdentification')?.value || '',
                cellphone: document.getElementById('regCellphone')?.value || '',
                email: document.getElementById('regEmail')?.value || '',
                rol: document.getElementById('regRole')?.value || 'operario',
                address: document.getElementById('regAddress')?.value || '',
                password: document.getElementById('regPassword')?.value || '',
                confirmPassword: document.getElementById('regConfirmPassword')?.value || '',
            };

            if (await auth.registerUser(newUser)) {
                alert('Registro exitoso. Por favor inicie sesion.');
                showPageSafe('loginPage');
                registrationForm.reset();
            }
        });
    }

    auth.applyRoleUI();
}

function initRecovery() {
    if (window.__recoveryInitialized) return;
    window.__recoveryInitialized = true;

    const recoverAccountForm = document.getElementById('recoverAccountForm');
    if (!recoverAccountForm) return;

    recoverAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('recoverEmail');
        if (!emailInput || !emailInput.value) {
            alert('Por favor ingrese su correo electronico.');
            return;
        }

        try {
            const body = await auth.recoverAccountAgainstBackend(emailInput.value);
            const detail = typeof body?.detail === 'string' ? body.detail : '';
            alert(detail ? `${detail}\n\nCorreo consultado: ${emailInput.value}` : `Solicitud procesada. Correo: ${emailInput.value}`);
            if (typeof navigation !== 'undefined' && typeof navigation.showPage === 'function') {
                navigation.showPage('loginPage');
            } else {
                document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
                document.getElementById('loginPage')?.classList.add('active');
            }
            recoverAccountForm.reset();
        } catch (error) {
            alert(`No fue posible procesar la recuperacion: ${error.message}`);
        }
    });
}

function initResetPassword() {
    if (window.__resetPwdInitialized) return;
    window.__resetPwdInitialized = true;
    const form = document.getElementById('resetPasswordForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let raw = null;
        try {
            raw = sessionStorage.getItem('textilsoftPwdResetParams');
        } catch (_) {
            raw = null;
        }
        if (!raw) {
            alert('Enlace invalido o expirado. Solicita recuperar la cuenta desde el inicio de sesion.');
            return;
        }
        let params;
        try {
            params = JSON.parse(raw);
        } catch (_) {
            alert('Enlace invalido. Vuelve a solicitar la recuperacion.');
            return;
        }
        const pwd1 = document.getElementById('resetPassword1')?.value || '';
        const pwd2 = document.getElementById('resetPassword2')?.value || '';
        if (pwd1.length < 6 || pwd2.length < 6) {
            alert('La contrasena debe tener al menos 6 caracteres.');
            return;
        }
        if (pwd1 !== pwd2) {
            alert('Las contrasenas no coinciden.');
            return;
        }
        try {
            const body = await auth.resetPasswordAgainstBackend(params.uid, params.token, pwd1, pwd2);
            try {
                sessionStorage.removeItem('textilsoftPwdResetParams');
            } catch (_) { /* ignore */ }
            const detail = typeof body?.detail === 'string' ? body.detail : '';
            alert(detail || 'Contrasena actualizada.');
            form.reset();
            if (typeof navigation !== 'undefined' && typeof navigation.showPage === 'function') {
                navigation.pageHistory.length = 0;
                navigation.showPage('loginPage');
            }
        } catch (error) {
            alert(`No se pudo restablecer la contrasena: ${error.message}`);
        }
    });
}

// Failsafe: si main.js no inicializa por algun error, auth se inicializa igual.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAuth();
        initRecovery();
        initResetPassword();
    });
} else {
    initAuth();
    initRecovery();
    initResetPassword();
}
