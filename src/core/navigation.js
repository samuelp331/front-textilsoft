// Navigation module
const navigation = (() => {
    // Navigation stack to track page history
    const pageHistory = [];

    // Function to show a specific page
    function showPage(pageId) {
        console.log(`Attempting to show page: ${pageId}`);
        if (typeof auth !== 'undefined' && typeof auth.hasPageAccess === 'function') {
            const publicPages = new Set([
                'loginPage',
                'registrationPage',
                'recoverAccountPage',
                'resetPasswordPage',
            ]);
            if (!publicPages.has(pageId) && !auth.hasPageAccess(pageId)) {
                alert('No tienes permisos para acceder a esta seccion.');
                return;
            }
        }
        const targetPage = document.getElementById(pageId);

        if (!targetPage) {
            console.error(`Page with ID "${pageId}" not found.`);
            return;
        }

        const currentPageElement = document.querySelector('.page.active');

        // If there's a current active page and it's not the target page, push its ID to history
        if (currentPageElement && currentPageElement.id !== pageId) {
             console.log(`Hiding page: ${currentPageElement.id}`);
             // Only push if we are not going back to the same page already in history
             if (pageHistory.length === 0 || pageHistory[pageHistory.length - 1] !== currentPageElement.id) {
                pageHistory.push(currentPageElement.id);
                console.log("History updated:", pageHistory);
             }
            currentPageElement.classList.remove('active');
        } else if (!currentPageElement) {
            console.log("No active page found initially.");
        } else if (currentPageElement.id === pageId) {
            console.log(`Page ${pageId} is already active. No change needed.`);
            return; // Don't do anything if already on the target page
        }


        // Deactivate all pages first to ensure only the target page is active
        document.querySelectorAll('.page').forEach(page => {
            // Ensure we don't accidentally hide the target page if it was already active
             if (page.id !== pageId) {
                page.classList.remove('active');
             }
        });

        // Activate the target page
        console.log(`Setting page ${pageId} to active`);
        targetPage.classList.add('active');

        // Ensure the page is visible at the top (useful for long pages)
        window.scrollTo(0, 0);

        // Note: Page-specific initialization (like loading inventory data)
        // is handled by MutationObserver in relevant modules (inventory.js, profile.js, etc.)

        // Verification (optional)
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(targetPage);
            // Check if the page is actually visible (display != none)
            if (computedStyle.display === 'none' && !targetPage.classList.contains('active')) {
                 // This is ok if it was hidden and not the target
            } else if (computedStyle.display === 'none' && targetPage.classList.contains('active')) {
                 console.warn(`WARNING: Page ${pageId} still has display:none despite active class. Check CSS.`);
            }
        }, 50); // Give the browser a moment to apply styles

    }

    // Navigation back function
    function goBack() {
        console.log("Go back requested. Current History:", pageHistory);
        if (pageHistory.length > 0) {
            const previousPageId = pageHistory.pop(); // Get the last page from history
            console.log(`Going back to page: ${previousPageId}`);

            // Deactivate the current page
            const currentActivePage = document.querySelector('.page.active');
            if (currentActivePage) {
                currentActivePage.classList.remove('active');
            }

            // Activar página anterior solo si el rol puede verla (solo con sesión; sin usuario no aplicar bloqueos)
            const publicPagesBack = new Set([
                'loginPage',
                'registrationPage',
                'recoverAccountPage',
                'resetPasswordPage',
            ]);
            const loggedIn =
                typeof auth !== 'undefined' && auth.currentUser !== null && auth.currentUser !== undefined;
            if (
                loggedIn &&
                typeof auth.hasPageAccess === 'function' &&
                previousPageId &&
                !publicPagesBack.has(previousPageId) &&
                !auth.hasPageAccess(previousPageId)
            ) {
                console.warn(`Acceso denegado al volver a "${previousPageId}". Redirigiendo al inicio.`);
                document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
                const dash = document.getElementById('dashboardPage');
                if (dash) {
                    dash.classList.add('active');
                    window.scrollTo(0, 0);
                }
                return;
            }

            const previousPage = document.getElementById(previousPageId);
            if (previousPage) {
                previousPage.classList.add('active');
                console.log(`Page shown: ${previousPageId}`);
                 window.scrollTo(0, 0); // Scroll to top
            } else {
                console.error(`Previous page "${previousPageId}" not found in DOM. History state lost.`);
                // If the previous page element doesn't exist, try to go to dashboard as a fallback
                if (document.getElementById('dashboardPage')) {
                    showPage('dashboardPage'); // Using showPage here is okay as a fallback
                } else {
                    console.error('Dashboard page not found. Unable to recover navigation.');
                }
            }
        } else {
            console.log("No history, defaulting to dashboard page.");
            // If no history, going back typically means going to the dashboard from a main page
            // or doing nothing if already on dashboard. Let's default to dashboard.
            if (document.getElementById('dashboardPage')) {
                // Don't use showPage here to avoid adding dashboard to an empty history
                 document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
                 document.getElementById('dashboardPage').classList.add('active');
                 window.scrollTo(0, 0);
                 console.log("Defaulted to dashboard page.");
            } else {
                console.error('Dashboard page not found. Unable to find a default page.');
            }
        }
    }

    let backButtonsDelegationRegistered = false;

    // Un solo listener en #app: evita duplicados cuando setupBackButtons() se llama varias veces
    // (initNavigation, main.js, reports, alertas); duplicados hacían doble goBack en un clic.
    function setupBackButtons() {
        const appRoot = document.getElementById('app');
        if (!appRoot || backButtonsDelegationRegistered) {
            return;
        }
        backButtonsDelegationRegistered = true;

        appRoot.addEventListener('click', (e) => {
            const target = e.target;
            const backBtn =
                typeof target.closest === 'function' ? target.closest('.back-btn') : null;
            if (!backBtn || !appRoot.contains(backBtn)) {
                return;
            }
            e.preventDefault();
            goBack();
        });
        console.log('Back navigation: clic delegado en #app (.back-btn).');
    }


    return {
        showPage,
        goBack,
        pageHistory,
        setupBackButtons // Expose the setup function
    };
})();

// Initialization function for Navigation module (event listeners)
function initNavigation() {
    console.log("Initializing navigation listeners...");

    // Setup listeners for dashboard navigation buttons
    const dashboardBtns = document.querySelectorAll('.dashboard-btn');
    dashboardBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.dataset.page + 'Page'; // e.g., 'profile' -> 'profilePage'
            if (typeof auth !== 'undefined' && typeof auth.hasPageAccess === 'function' && !auth.hasPageAccess(pageId)) {
                alert('No tienes permisos para acceder a esta seccion.');
                return;
            }
            navigation.showPage(pageId);
        });
    });
    console.log(`Attached listeners to ${dashboardBtns.length} dashboard buttons.`);


    // Setup listeners for 'SALIR' or other exit buttons that should go back to login
    // Assuming 'SALIR' buttons on registration and recovery pages should go back to login
    const exitRegistrationBtn = document.getElementById('exitRegistrationBtn');
    const exitRecoveryBtn = document.getElementById('exitRecoveryBtn');

    if (exitRegistrationBtn) {
         exitRegistrationBtn.addEventListener('click', () => {
             console.log("Exit Registration button clicked.");
             // Clear history when going back to login from these specific pages
             navigation.pageHistory.length = 0;
             navigation.showPage('loginPage');
         });
    }

     if (exitRecoveryBtn) {
         exitRecoveryBtn.addEventListener('click', () => {
             console.log("Exit Recovery button clicked.");
             // Clear history when going back to login from these specific pages
             navigation.pageHistory.length = 0;
             navigation.showPage('loginPage');
         });
     }

    const exitResetPasswordBtn = document.getElementById('exitResetPasswordBtn');
    if (exitResetPasswordBtn) {
        exitResetPasswordBtn.addEventListener('click', () => {
            navigation.pageHistory.length = 0;
            try {
                sessionStorage.removeItem('textilsoftPwdResetParams');
            } catch (_) { /* ignore */ }
            navigation.showPage('loginPage');
        });
    }


    // Setup listeners for 'Volver' (back) buttons using event delegation or direct attachment
    // The setupBackButtons function is better as it finds all current back buttons
    navigation.setupBackButtons();


    // --- MutationObserver to handle page activation side effects ---
    // This observes changes to the 'class' attribute on all elements with the class 'page'.
    // When a page gets the 'active' class, it triggers specific logic for that page.
    // This replaces page-specific initialization within the app.js or showPage function.

    const pageObserver = new MutationObserver((mutationsList) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const targetElement = mutation.target; // The .page element that changed class

                if (targetElement.classList.contains('active')) {
                    console.log(`Page "${targetElement.id}" became active.`);

                    // --- Page Specific Initialization/Updates ---
                    switch (targetElement.id) {
                        case 'profilePage':
                             console.log("Profile page activated. Loading user data...");
                            // Check if auth and profile modules are available globally
                             if (typeof auth !== 'undefined' && typeof profile !== 'undefined' && typeof profile.loadProfileData === 'function') {
                                // Load current user data into the profile form
                                const currentUser = auth.currentUser;
                                if (currentUser) {
                                    profile.loadProfileData(currentUser);
                                    console.log("Profile data loaded:", currentUser);
                                } else {
                                     console.warn("No current user found when profile page activated.");
                                    // Optionally clear the form or show a message
                                     if (typeof profile.clearProfileFields === 'function') {
                                         profile.clearProfileFields();
                                     }
                                }
                             } else {
                                 console.error("Auth or Profile module/function not found. Cannot load profile data.");
                             }
                            break;

                        case 'productPage':
                            console.log("Product page activated. Displaying inventory UI...");
                            // Check if inventory UI module is available globally
                            if (typeof displayInventoryUI === 'function') {
                                 const productContent = document.getElementById('productContent');
                                 if(productContent) {
                                     // Clear content and show loading message before display
                                     productContent.innerHTML = '<h2>Inventario</h2><p>Cargando inventario...</p>';
                                 }
                                 displayInventoryUI(); // Display the inventory table
                            } else {
                                console.error("displayInventoryUI function not found. Cannot display inventory.");
                                 const productContent = document.getElementById('productContent');
                                 if(productContent) {
                                     productContent.innerHTML = '<h2>Inventario</h2><p>Error al cargar el inventario.</p>';
                                 }
                            }
                            break;

                        // Add other page-specific activation logic here
                        case 'reportsPage':
                             console.log("Reports page activated.");
                            // Potentially load reports data or setup reports view here
                            break;

                         case 'alertsPage':
                             console.log("Alerts page activated.");
                             // Potentially load alerts here
                            break;

                        case 'suppliersPage':
                            if (typeof window.refreshSuppliersPage === 'function') {
                                window.refreshSuppliersPage();
                            }
                            break;

                        default:
                            console.log(`No specific activation logic for page "${targetElement.id}".`);
                            break;
                    }
                }
                 // Optional: Handle page deactivation if needed (e.g., clearing forms, stopping animations)
                 // else {
                 //    console.log(`Page "${targetElement.id}" became inactive.`);
                 //    switch (targetElement.id) {
                 //        case 'profilePage':
                 //            console.log("Profile page deactivated. Clearing form.");
                 //             if (typeof profile.clearProfileFields === 'function') {
                 //                 profile.clearProfileFields();
                 //             }
                 //            break;
                 //        case 'productPage':
                 //             console.log("Product page deactivated. Clearing display.");
                 //             if (typeof clearInventoryDisplayUI === 'function') {
                 //                 clearInventoryDisplayUI();
                 //             }
                 //            break;
                 //         default:
                 //            break;
                 //    }
                 //}
            }
        }
    });

    // Start observing all elements that have the 'page' class within the #app container
    const appElement = document.getElementById('app');
    if (appElement) {
        appElement.querySelectorAll('.page').forEach(pageElement => {
            pageObserver.observe(pageElement, { attributes: true });
        });
         console.log(`MutationObserver setup to watch ${appElement.querySelectorAll('.page').length} page elements.`);
    } else {
        console.error("#app element not found! Cannot setup MutationObserver for pages.");
    }

    console.log("Navigation initialization complete (initNavigation function finished).");
}

// Make the initNavigation function globally available
window.initNavigation = initNavigation;