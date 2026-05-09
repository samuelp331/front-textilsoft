// General Modal Utility Functions

// Function to close a given modal element
function closeModal(modalElement) {
    if (modalElement) {
        modalElement.style.display = 'none';
        console.log("Closed modal:", modalElement.id);
    } else {
        console.warn("Attempted to close a null or undefined modal element.");
    }
}

// Function to set up listeners for all default modal close buttons (e.g., the 'x')
function setupModalCloseButtons() {
    console.log("setupModalCloseButtons called.");
    // Select all elements with the class 'close-button' within elements that have the class 'modal'
    const closeButtons = document.querySelectorAll('.modal .close-button');

    console.log(`Found ${closeButtons.length} modal close buttons.`);

    if (closeButtons.length === 0) {
        console.log("No modal close buttons found.");
        return;
    }

    closeButtons.forEach(btn => {
        // Clear previous event listeners by cloning and replacing
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        const modalId = newBtn.closest('.modal')?.id || 'unknown modal';
        console.log(`Attaching close listener to button in modal: ${modalId}`);
        newBtn.addEventListener('click', function() {
            console.log(`Close button clicked in modal: ${modalId}!`);
            const modalToClose = this.closest('.modal');
            if (modalToClose) {
                closeModal(modalToClose);
            } else {
                console.error("Could not find parent modal for close button.");
            }
        });
    });
    
    // Optional: Close modal if clicking outside the content (on the backdrop)
    // Using event delegation on the window or document is efficient
    // Add this listener only once to avoid performance issues
    if (!window.modalBackdropListenerAttached) {
        window.addEventListener('click', function(event) {
             // Check if the click occurred *inside* any modal content. If so, do nothing.
             // This prevents closing when clicking inputs, labels, or buttons *within* the modal form.
            let clickedInsideModalContent = false;
            document.querySelectorAll('.modal-content').forEach(content => {
                if (content.contains(event.target)) {
                    clickedInsideModalContent = true;
                }
            });

            if (clickedInsideModalContent) {
                 // console.log("Clicked inside modal content, not closing modal."); 
                 return; 
            }

            // Now iterate over all modals to see if the click was on the modal backdrop itself
            document.querySelectorAll('.modal').forEach(modal => {
                // Check if the clicked element is the modal itself (the backdrop), not a child element
                // And check if the modal is currently displayed (important check)
                if (event.target === modal && modal.style.display === 'block') {
                    console.log("Click detected on modal backdrop.");
                    closeModal(modal);
                    console.log("Closed modal by clicking backdrop:", modal.id);
                }
            });
        });
        window.modalBackdropListenerAttached = true; 
        console.log("Modal backdrop listener attached to window.");
    } else {
         console.log("Modal backdrop listener already attached.");
    }

    console.log("General modal close button setup complete.");
}

// Initialization function for modal utilities
function initModalUtils() {
     console.log("Initializing Modal Utilities...");
     // Call setupModalCloseButtons now that DOM is ready
     setupModalCloseButtons();
     // Note: If modals are added to the DOM *after* this initialization,
     // setupModalCloseButtons would need to be called again, or you'd need a MutationObserver.
     // Given the current index.html structure, all modals are present initially.
     console.log("Modal Utilities Initialized.");
}

// Expose the utility functions and initializer globally
window.closeModal = closeModal;
window.setupModalCloseButtons = setupModalCloseButtons; 
window.initModalUtils = initModalUtils;