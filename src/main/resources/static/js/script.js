// ============================================
// SCRIPT.JS - UI Helpers Only
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const loginForm = document.querySelector("#login");
    const signupForm = document.querySelector("#register");

    // ============================================
    // FORM TOGGLE FUNCTIONS
    // ============================================
    window.signup = () => {
        signupForm.style.right = "auto";
        signupForm.style.left = "50%";
        signupForm.style.transform = "translateX(-50%)";
        loginForm.style.left = "-120%";
    };

    window.login = () => {
        signupForm.style.right = "-120%";
        signupForm.style.left = "auto";
        signupForm.style.transform = "translateX(0)";
        loginForm.style.left = "0";
    };

    // ============================================
    // PASSWORD VISIBILITY TOGGLE
    // ============================================
    window.togglePassword = (inputId, toggleId) => {
        const passwordField = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        const isPasswordHidden = passwordField.type === "password";

        passwordField.type = isPasswordHidden ? "text" : "password";
        toggleIcon.classList.replace(
            isPasswordHidden ? "bx-hide" : "bx-show",
            isPasswordHidden ? "bx-show" : "bx-hide"
        );
    };

    // ============================================
    // ENTER KEY LISTENERS
    // ============================================
    const loginEmail = document.querySelector("#login-email");
    const loginPassword = document.querySelector("#login-password");

    if (loginEmail && loginPassword) {
        [loginEmail, loginPassword].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    signIn();
                }
            });
        });
    }
});