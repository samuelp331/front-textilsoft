// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing application...");

    // Initialize general modal utility functions FIRST.
    // modal-utils.js exposes initModalUtils. This sets up 'x' button and backdrop clicks.
    if (typeof initModalUtils === 'function') {
        initModalUtils();
        console.log("Modal Utils initialized.");
    } else {
        console.error("initModalUtils function not found. Modal close buttons may not work.");
    }


    // Initialize authentication module.
    // auth.js exposes the 'auth' module and the 'initAuth' and 'initRecovery' functions.
    if (typeof auth !== 'undefined' && typeof initAuth === 'function') {
         initAuth();
         console.log("Auth module initialized.");
    } else {
        console.error("Auth module or initAuth function not found. Authentication will not work.");
    }

    // Initialize recovery password logic.
    if (typeof initRecovery === 'function') {
       initRecovery();
       console.log("Recovery listener initialized.");
    } else {
       console.warn("initRecovery function not found."); // Less critical error
    }

    // Initialize navigation logic.
    // navigation.js exposes the 'navigation' module and the 'initNavigation' function.
    // This should be initialized *after* auth if navigation logic depends on auth state,
    // but before page-specific modules if navigation triggers their updates.
    // The MutationObserver in navigation.js handles page-specific loads based on the 'active' class.
    if (typeof navigation !== 'undefined' && typeof initNavigation === 'function') {
        initNavigation();
        console.log("Navigation module initialized.");
        
        // Explícitamente configurar los botones "Volver" después de inicializar la navegación
        if (typeof navigation.setupBackButtons === 'function') {
            navigation.setupBackButtons();
            console.log("Back buttons setup called explicitly.");
        }
    } else {
        console.error("Navigation module or initNavigation function not found. Cannot proceed with navigation setup.");
    }


    // Initialize profile page functionality.
    // profile.js exposes the 'profile' module and the 'initProfile' function.
    // This sets up form listeners (like photo upload, potential save).
    // Loading data is triggered by navigation's MutationObserver.
    if (typeof profile !== 'undefined' && typeof initProfile === 'function') {
        initProfile();
        console.log("Profile module initialized.");
    } else {
        console.warn("Profile module or initProfile function not found. Profile functionality may be limited.");
    }

    // Initialize inventory functionality.
    // inventory.js exposes the 'inventory' module and the 'initInventory' function.
    // This sets up button listeners for the product page and calls modal/view functions.
    // It also handles triggering the display via the MutationObserver.
    if (typeof inventory !== 'undefined' && typeof initInventory === 'function') {
        initInventory();
        console.log("Inventory module initialized.");
    } else {
        console.error("Inventory module or initInventory function not found. Inventory functionality may not work correctly.");
    }

    // Initialize reports page functionality.
    // reports.js exposes the 'reports' module and the 'initReports' function.
    if (typeof initReports === 'function') {
        try {
            console.log('Intentando inicializar el módulo de reportes...');
            initReports();
            console.log('✅ Módulo de reportes inicializado correctamente');
            
            // Configurar explícitamente los botones de regreso después de inicializar reportes
            setTimeout(() => {
                if (typeof navigation !== 'undefined' && typeof navigation.setupBackButtons === 'function') {
                    navigation.setupBackButtons();
                    console.log("Back buttons reinitialized after reports module setup.");
                }
            }, 500);
        } catch (error) {
            console.error('❌ Error al inicializar el módulo de reportes:', error);
        }
    } else {
        console.warn('⚠️ La función initReports no está disponible. Verifica que reports.js esté cargado correctamente.');
    }

    // Initialize alerts module
    if (typeof initAlerts === 'function') {
        try {
            console.log('Inicializando módulo de alertas...');
            initAlerts();
            console.log('✅ Módulo de alertas inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar el módulo de alertas:', error);
        }
    } else {
        console.warn('⚠️ La función initAlerts no está disponible. Verifica que alerts.js esté cargado correctamente.');
    }

    if (typeof setupSuppliersPage === 'function') {
        setupSuppliersPage();
        console.log('Proveedores: listeners registrados.');
    }

    // Initialize admin panel module
    if (typeof initAdminPanel === 'function') {
        try {
            console.log('Inicializando módulo de panel administrativo...');
            initAdminPanel();
            console.log('✅ Módulo de panel administrativo inicializado correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar el panel administrativo:', error);
        }
    } else {
        console.warn('⚠️ La función initAdminPanel no está disponible.');
    }

    // Initial setup: pantalla inicial (restablecer contraseña desde enlace del correo, o login)
    console.log("App initialized. Showing initial page.");
    if (typeof navigation !== 'undefined' && typeof navigation.showPage === 'function') {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('textilsoftPwdResetParams')) {
            navigation.showPage('resetPasswordPage');
        } else {
            navigation.showPage('loginPage');
        }
    } else {
         console.error("Navigation module not available after initialization. Cannot show login page automatically.");
         // Fallback: try to manually set the login page active if navigation fails
         document.getElementById('loginPage')?.classList.add('active');
    }
    
    // Configuración final adicional de los botones "Volver"
    setTimeout(() => {
        console.log("Final check for back buttons setup");
        if (typeof navigation !== 'undefined' && typeof navigation.setupBackButtons === 'function') {
            navigation.setupBackButtons();
        }
    }, 1000);
});