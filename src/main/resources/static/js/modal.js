// Show Confirm Modal
function showConfirmModal(message, onConfirm, onCancel) {
    const existingModal = document.getElementById("generic-confirm-modal");
    if (existingModal) existingModal.remove();

    const confirmModal = document.createElement("div");
    confirmModal.id = "generic-confirm-modal";

    // Modern backdrop with blur effect
    Object.assign(confirmModal.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '99998',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        opacity: '0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    const modalContent = document.createElement("div");

    // Modern card design with subtle shadows and rounded corners
    Object.assign(modalContent.style, {
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        maxWidth: '28rem',
        width: '100%',
        padding: '2rem',
        textAlign: 'center',
        transform: 'scale(0.95)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    // Create modern alert container with glassmorphism
    const iconContainer = document.createElement("div");
    Object.assign(iconContainer.style, {
        margin: '0 auto 1rem auto',
        width: '5rem',
        height: '5rem',
        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.9) 0%, rgba(255, 87, 51, 0.9) 50%, rgba(220, 38, 38, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        clipPath: 'polygon(50% 5%, 5% 90%, 95% 90%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `
            0 25px 50px -12px rgba(255, 87, 51, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `,
        position: 'relative',
        animation: 'pulse-glow 2s ease-in-out infinite',
        transform: 'translateZ(0)'
    });

    // Add modern glow animation
    if (!document.getElementById('pulse-glow-style')) {
        const glowStyle = document.createElement('style');
        glowStyle.id = 'pulse-glow-style';
        glowStyle.textContent = `
        @keyframes pulse-glow {
            0%, 100% { 
                box-shadow: 
                    0 25px 50px -12px rgba(255, 87, 51, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }
            50% { 
                box-shadow: 
                    0 25px 50px -12px rgba(255, 87, 51, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    0 0 30px rgba(255, 87, 51, 0.3);
            }
        }`;
        document.head.appendChild(glowStyle);
    }

    // Create modern exclamation with subtle animation
    const alertIcon = document.createElement("div");
    Object.assign(alertIcon.style, {
        color: 'white',
        fontSize: '2rem',
        fontWeight: '900',
        textAlign: 'center',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
        marginTop: '0.5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
        animation: 'icon-bounce 2s ease-in-out infinite',
        userSelect: 'none'
    });
    alertIcon.textContent = '!';

    // Add bounce animation for the icon
    if (!document.getElementById('icon-bounce-style')) {
        const bounceStyle = document.createElement('style');
        bounceStyle.id = 'icon-bounce-style';
        bounceStyle.textContent = `
        @keyframes icon-bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-2px) scale(1.05); }
        }`;
        document.head.appendChild(bounceStyle);
    }
    iconContainer.appendChild(alertIcon);

    // Create message text
    const messageText = document.createElement("p");
    messageText.id = "confirm-modal-text";
    messageText.textContent = message;
    Object.assign(messageText.style, {
        fontSize: '1.25rem',
        fontWeight: '500',
        color: '#475569',
        lineHeight: '1.75',
        margin: '0 0 1.5rem 0'
    });

    // Create button container
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center'
    });

    // Create Cancel button
    const cancelButton = document.createElement("button");
    cancelButton.id = "confirmCancel";
    cancelButton.textContent = "Cancel";
    Object.assign(cancelButton.style, {
        padding: '0.625rem 1.5rem',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        fontWeight: '500',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        fontSize: '0.875rem'
    });

    // Create Confirm button
    const confirmButton = document.createElement("button");
    confirmButton.id = "confirmOk";
    confirmButton.textContent = "Confirm";
    Object.assign(confirmButton.style, {
        padding: '0.625rem 1.5rem',
        background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 50%, #dc2626 100%)',
        color: 'white',
        fontWeight: '500',
        borderRadius: '0.75rem',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease-in-out',
        fontSize: '0.875rem'
    });

    // Add hover effects
    const addHoverEffect = (element, hoverStyles, originalStyles) => {
        element.addEventListener('mouseenter', () => {
            Object.assign(element.style, hoverStyles);
        });
        element.addEventListener('mouseleave', () => {
            Object.assign(element.style, originalStyles);
        });
    };

    addHoverEffect(cancelButton, {
        backgroundColor: '#e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-1px)'
    }, {
        backgroundColor: '#f1f5f9',
        boxShadow: 'none',
        transform: 'translateY(0)'
    });

    addHoverEffect(confirmButton, {
        background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 50%, #b91c1c 100%)',
        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.2)',
        transform: 'translateY(-1px)'
    }, {
        background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 50%, #dc2626 100%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(0)'
    });

    // Add active effects
    cancelButton.addEventListener('mousedown', () => {
        cancelButton.style.transform = 'scale(0.95)';
    });
    cancelButton.addEventListener('mouseup', () => {
        cancelButton.style.transform = 'scale(1)';
    });

    confirmButton.addEventListener('mousedown', () => {
        confirmButton.style.transform = 'scale(0.95)';
    });
    confirmButton.addEventListener('mouseup', () => {
        confirmButton.style.transform = 'scale(1)';
    });

    // Assemble the modal
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);

    modalContent.appendChild(iconContainer);
    modalContent.appendChild(messageText);
    modalContent.appendChild(buttonContainer);

    confirmModal.appendChild(modalContent);
    document.body.appendChild(confirmModal);

    const closeModal = () => {
        confirmModal.style.opacity = '0';
        modalContent.style.transform = 'scale(0.95)';
        setTimeout(() => confirmModal.remove(), 300);
    };

    confirmButton.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    cancelButton.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });

    // Animate in
    requestAnimationFrame(() => {
        confirmModal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    });
}
function showTemporaryModal(message) {
    showLoadingModal(message);
    setTimeout(hideLoadingModal, 2000);
}
// Show Loading Modal
function showLoadingModal(message) {
    const existingModal = document.getElementById('loading-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'loading-modal';

    // Modern backdrop styling
    Object.assign(modal.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '99999',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        opacity: '0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        maxWidth: '28rem',
        width: '100%',
        padding: '2rem',
        textAlign: 'center',
        transform: 'scale(0.95)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    // Create spinner container
    const spinnerContainer = document.createElement('div');
    Object.assign(spinnerContainer.style, {
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'center'
    });

    // Create modern spinner
    const spinner = document.createElement('div');
    Object.assign(spinner.style, {
        width: '3rem',
        height: '3rem',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    });

    // Create message
    const messageElement = document.createElement('p');
    messageElement.id = 'modal-message';
    messageElement.textContent = message;
    Object.assign(messageElement.style, {
        fontSize: '1.25rem',
        fontWeight: '500',
        color: '#475569',
        lineHeight: '1.75',
        margin: '0'
    });

    spinnerContainer.appendChild(spinner);
    modalContent.appendChild(spinnerContainer);
    modalContent.appendChild(messageElement);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add spin animation
    if (!document.getElementById('modal-spin-style')) {
        const style = document.createElement('style');
        style.id = 'modal-spin-style';
        style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        document.head.appendChild(style);
    }

    // Animate in
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    });

    return modal;
}

// Hide Loading Modal
function hideLoadingModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) {
        const modalContent = modal.querySelector('div');
        modal.style.opacity = '0';
        if (modalContent) modalContent.style.transform = 'scale(0.95)';
        setTimeout(() => modal.remove(), 300);
    }
}
function addErrorModalStyles() {
    if (!document.querySelector('#error-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'error-modal-styles';
        style.textContent = `
            .error-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .error-modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 450px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                animation: slideUp 0.3s ease;
                overflow: hidden;
            }
            
            .error-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 25px;
                background: #fff5f5;
                border-bottom: 1px solid #ffeaea;
            }
            
            .error-modal-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .error-modal-close:hover {
                background: #ffeaea;
                color: #ff4757;
            }
            
            .error-modal-body {
                padding: 25px;
            }
            
            .error-modal-footer {
                padding: 20px 25px;
                background: #f9f9f9;
                border-top: 1px solid #eee;
                text-align: right;
            }
            
            .error-modal-ok {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 15px;
            }
            
            .error-modal-ok:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .error-modal-content {
                    width: 95%;
                    margin: 10px;
                }
                
                .error-modal-header,
                .error-modal-body,
                .error-modal-footer {
                    padding: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function showErrorModal(message, duration = 5000) {
    // Remove existing error modal
    const existingModal = document.querySelector('.error-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
        <div class="error-modal-overlay">
            <div class="error-modal-content">
                <div class="error-modal-header">
                    <i class="fas fa-exclamation-circle" style="color: #ff4757; font-size: 24px;"></i>
                    <h3 style="margin: 0; color: #333;">Validation Error</h3>
                    <button class="error-modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="error-modal-body">
                    <p style="margin: 15px 0; color: #555; line-height: 1.5;">${message}</p>
                </div>
                <div class="error-modal-footer">
                    <button class="error-modal-ok" onclick="this.parentElement.parentElement.parentElement.remove()">
                        OK, I Understand
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Auto remove after duration
    setTimeout(() => {
        const modal = document.querySelector('.error-modal-overlay');
        if (modal) modal.remove();
    }, duration);
}
