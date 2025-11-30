// ============================================
// LOGIN.JS - UI Integration Only
// ============================================

// Better approach - works in both development and production
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'  // For local development
    : 'https://shareview-production.up.railway.app';  // For production

// State management
let authState = {
    isForgotPasswordFlow: false,
    tempUserData: []
};

// Initialize event listeners once
document.addEventListener('DOMContentLoaded', function() {
    const verifyButton = document.getElementById("verify-btn");
    if (verifyButton) {
        verifyButton.addEventListener("click", verifyOtp);
    }
});

// ============================================
// SIGN IN
// ============================================
async function signIn() {
    const email = document.querySelector("#login-email").value;
    const password = document.querySelector("#login-password").value;

    showLoadingModal("Signing in...");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signIn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
console.log(data);
        if (response.ok && data.status === 'success') {
            // Store in localStorage
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userId', data.id);
            localStorage.setItem('userRole', data.role);

            // Redirect based on role
            showLoadingModal(`Welcome back, ${data.firstName}!`);
            setTimeout(() => {
                window.location.href = data.role === 'ADMIN' ? '/admin-dashboard' : '/main-feed';
            }, 1000);
        } else {
            hideLoadingModal();
            showTemporaryModal(data.message || 'Login failed');
        }
    } catch (error) {
        hideLoadingModal();
        showTemporaryModal('Connection error. Please try again.');
    }
}

// ============================================
// REGISTER
// ============================================
async function register() {
    const firstName = document.querySelector("#register input[placeholder='First Name']").value.trim();
    const lastName = document.querySelector("#register input[placeholder='Last Name']").value.trim();
    const bDate = document.querySelector("#birthday").value.trim();
    const gender = document.querySelector("#gender").value.trim();
    const email = document.querySelector("#signup-email").value.trim();
    const password = document.querySelector("#signup-password").value.trim();
    const confirmPassword = document.querySelector("#confirm-password").value.trim();

    // DEBUG: Check the actual date value
    console.log("Raw birthday value:", bDate);

    // Validate date format
    if (!isValidDate(bDate)) {
        showTemporaryModal("Please select a valid birth date!");
        return;
    }

    if (!firstName || !lastName || !email || !password || !bDate || !gender || !confirmPassword) {
        showTemporaryModal("Please fill in all fields!");
        return;
    }
    if (password !== confirmPassword) {
        showTemporaryModal("Passwords do not match!");
        return;
    }

    // Store temporarily for after OTP verification
    authState.tempUserData = { firstName, lastName, email, bDate, gender, password};
    console.log("Data being sent:", JSON.stringify(authState.tempUserData));
    await sendOtp();
}

// Add date validation function
function isValidDate(dateString) {
    if (!dateString) return false;

    // Check if it's a valid YYYY-MM-DD format
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    // Parse the date and check if it's valid
    const date = new Date(dateString);
    const year = date.getFullYear();

    // Check if year is reasonable (between 1900 and current year)
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) {
        console.log("Invalid year:", year);
        return false;
    }

    // Check if the date is valid
    return !isNaN(date.getTime());
}
// ============================================
// FORGOT PASSWORD
// ============================================
async function forgotPassword() {
    const emailInput = document.querySelector("#login-email");
    const email = emailInput.value.trim();

    if (!email) {
        showLoadingModal("Please enter your email.");
        setTimeout(hideLoadingModal, 2000);
        return;
    }

    showConfirmModal("Do you want to reset your password?", async () => {
        showLoadingModal("Checking email...");

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email})
            });

            const responseData = await response.json();

            if (response.ok && responseData.status === "success") {
                authState.isForgotPasswordFlow = true;
                handleOtpSent();
            } else {
                showLoadingModal(responseData.message || "Email not found");
                setTimeout(hideLoadingModal, 2000);
            }
        } catch (error) {
            console.error("Forgot password error:", error);
            showLoadingModal("Something went wrong");
            setTimeout(hideLoadingModal, 2000);
        }
    });
}

// ============================================
// SEND OTP
// ============================================
async function sendOtp() {
    const emailInput = authState.isForgotPasswordFlow
        ? document.querySelector("#login-email")
        : document.querySelector("#signup-email");
    const email = emailInput.value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showLoadingModal("Please enter a valid email address.");
        setTimeout(hideLoadingModal, 1000);
        return;
    }
    if (!email) {
        showLoadingModal("Please enter your email address!");
        setTimeout(hideLoadingModal, 1000);
        return;
    }

    showLoadingModal("Sending OTP...");
    try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email})
        });

        const responseData = await response.json();
        if (response.ok && responseData.status === "success") {
            handleOtpSent();
        } else {
            showLoadingModal(responseData.message || "Failed to send OTP.");
            setTimeout(hideLoadingModal, 2000);
        }
    } catch (error) {
        console.error("OTP send error:", error);
        showLoadingModal("Server error. Please try again later.");
        setTimeout(hideLoadingModal, 2000);
    }
}

// ============================================
// HANDLE OTP SENT
// ============================================
function handleOtpSent() {
    showLoadingModal("OTP sent successfully!");
    setTimeout(() => {
        hideLoadingModal();

        const otpModal = document.getElementById("otpModal");
        const otpInput = document.getElementById("otp-input");
        const verifyButton = document.getElementById("verify-btn");

        otpModal.classList.remove("hidden");
        otpInput.value = "";
        verifyButton.disabled = false;
        verifyButton.textContent = "Verify";
    }, 1500);
}

// ============================================
// VERIFY OTP
// ============================================
async function verifyOtp() {
    const emailInput = authState.isForgotPasswordFlow
        ? document.querySelector("#login-email")
        : document.querySelector("#signup-email");
    const email = emailInput.value.trim();

    const otpInput = document.querySelector("#otp-input");
    const otp = otpInput.value.trim();

    const verifyButton = document.getElementById("verify-btn");
    const otpModal = document.getElementById("otpModal");

    if (!otp) {
        // Hide OTP modal first
        otpModal.classList.add("hidden");

        // Show loading modal
        showLoadingModal("Please enter the OTP!");

        // After 1 second, hide loading modal and show OTP modal again
        setTimeout(() => {
            hideLoadingModal();
            otpModal.classList.remove("hidden");
        }, 1000);
        return;
    }

    // Hide OTP modal during verification
    otpModal.classList.add("hidden");
    showLoadingModal("Verifying OTP...");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, otp})
        });

        const responseData = await response.json();
        if (responseData.status === "success") {
            showLoadingModal("OTP Verified Successfully!");
            setTimeout(hideLoadingModal, 3000);
            verifyButton.disabled = true;
            verifyButton.textContent = "Verified";

            document.getElementById("otpModal").classList.add("hidden");

            if (authState.isForgotPasswordFlow) {
                document.getElementById("resetPasswordSection").classList.remove("hidden");
                authState.isForgotPasswordFlow = false;
            } else {
                await registerAfterOtp();
            }
        } else {
            showLoadingModal(responseData.message || "Verification failed.");
            setTimeout(hideLoadingModal, 2000);
            otpModal.classList.remove("hidden");
            verifyButton.disabled = false;
            verifyButton.textContent = "Verify";
        }
    } catch (error) {
        console.error("OTP verification error:", error);
        showLoadingModal("Server error. Please try again later.");
        setTimeout(hideLoadingModal, 2000);
        verifyButton.disabled = false;
        verifyButton.textContent = "Verify";
    }
}

// ============================================
// REGISTER AFTER OTP VERIFICATION
// ============================================
async function registerAfterOtp() {
    if (!authState.tempUserData) {
        showTemporaryModal("Registration data missing. Please try again.");
        return;
    }

    showLoadingModal("Creating account...");
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authState.tempUserData)
        });

        const data = await response.json();


        if (response.ok && data.status === 'success') {
            showLoadingModal("Account created successfully!");
            setTimeout(() => {
                // Clear temporary data
                authState.tempUserData = null;
                window.location.href="/";
            }, 1000);
        } else {
            showTemporaryModal(data.message || 'Registration failed');
        }
    } catch (error) {
        showTemporaryModal('Connection error. Please try again.');
    }
}

// ============================================
// RESET PASSWORD
// ============================================
async function resetPassword() {
    const newPasswordInput = document.getElementById("new-password");
    const confirmPasswordInput = document.getElementById("confirm-new-password");
    const emailInput = document.getElementById("login-email");

    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const email = emailInput.value.trim();

    if (!newPassword || !confirmPassword) {
        showLoadingModal("Fill all password fields.");
        setTimeout(hideLoadingModal, 2000);
        return;
    }

    if (newPassword !== confirmPassword) {
        showLoadingModal("Passwords do not match.");
        setTimeout(hideLoadingModal, 2000);
        return;
    }

    showLoadingModal("Resetting password...");
    try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, newPassword})
        });

        const responseData = await response.json();
        if (response.ok && responseData.status === "success") {
            showLoadingModal("Password reset successful!");
            setTimeout(() => {
                hideLoadingModal();
                document.getElementById("resetPasswordSection").classList.add("hidden");
            }, 2000);
        } else {
            showLoadingModal(responseData.message || "Failed to reset password.");
            setTimeout(hideLoadingModal, 2000);
        }
    } catch (error) {
        console.error("Password reset error:", error);
        showLoadingModal("Server error.");
        setTimeout(hideLoadingModal, 2000);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================


function closeOtpModal() {
    document.getElementById("otpModal").classList.add("hidden");
    authState.isForgotPasswordFlow = false;
}

function closeResetPasswordModal() {
    document.getElementById("resetPasswordSection").classList.add("hidden");
    authState.isForgotPasswordFlow = false;
}



// Export for HTML onclick
window.signIn = signIn;
window.register = register;
window.forgotPassword = forgotPassword;
window.resetPassword = resetPassword;
window.verifyOtp = verifyOtp;
window.closeOtpModal = closeOtpModal;
window.closeResetPasswordModal = closeResetPasswordModal;