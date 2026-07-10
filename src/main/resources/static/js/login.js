
let API_BASE_URL;

if (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') {
    // Local development
    API_BASE_URL = 'http://localhost:8080';
    console.log(' Running in LOCAL mode');
} else if (window.location.hostname.includes('railway.app')) {
    // Production on Render
    API_BASE_URL = 'https://shareview-production.up.railway.app'; // ← CHANGE TO YOUR ACTUAL BACKEND URL
    console.log(' Running in PRODUCTION mode');
} else {
    // Fallback
    API_BASE_URL = 'https://shareview-1.onrender.com';
    console.log(' Using fallback URL');
}

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
    try {
        // Get form values
        const firstName = document.querySelector("#register input[placeholder='First Name']")?.value?.trim() || '';
        const lastName = document.querySelector("#register input[placeholder='Last Name']")?.value?.trim() || '';
        const bDate = document.querySelector("#birthday")?.value?.trim() || '';
        const gender = document.querySelector("#gender")?.value?.trim() || '';
        const email = document.querySelector("#signup-email")?.value?.trim() || '';
        const password = document.querySelector("#signup-password")?.value?.trim() || '';
        const confirmPassword = document.querySelector("#confirm-password")?.value?.trim() || '';

        // DEBUG: Check the actual date value
        console.log("Raw birthday value:", bDate);

        // ==================== VALIDATION CONSTRAINTS ====================

        // 1. Check for empty fields
        const requiredFields = [
            { field: firstName, name: "First Name" },
            { field: lastName, name: "Last Name" },
            { field: email, name: "Email" },
            { field: password, name: "Password" },
            { field: confirmPassword, name: "Confirm Password" },
            { field: bDate, name: "Birth Date" },
            { field: gender, name: "Gender" }
        ];

        const emptyField = requiredFields.find(f => !f.field);
        if (emptyField) {
            showErrorModal(`<b>${emptyField.name}</b> is required!`);
            return;
        }

        // 2. Name validation
        const nameRegex = /^[A-Za-z\s]{2,50}$/;
        if (!nameRegex.test(firstName)) {
            showErrorModal(`<b>First Name</b> must be 2-50 letters only!`);
            return;
        }
        if (!nameRegex.test(lastName)) {
            showErrorModal(`<b>Last Name</b> must be 2-50 letters only!`);
            return;
        }

        // 3. Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showErrorModal(`Please enter a valid email address!<br><small>Example: user@example.com</small>`);
            return;
        }
        if (email.length > 100) {
            showErrorModal(`<b>Email</b> must be less than 100 characters!`);
            return;
        }

        // 4. Password validation
        const passwordConstraints = [
            { test: password.length >= 8, message: "<b>Password</b> must be at least 8 characters long!" },
            { test: /[A-Z]/.test(password), message: "<b>Password</b> must contain at least one uppercase letter!" },
            { test: /[a-z]/.test(password), message: "<b>Password</b> must contain at least one lowercase letter!" },
            { test: /[0-9]/.test(password), message: "<b>Password</b> must contain at least one number!" },
            { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: "<b>Password</b> must contain at least one special character!" },
            { test: password.length <= 100, message: "<b>Password</b> must be less than 100 characters!" }
        ];

        const failedPasswordConstraint = passwordConstraints.find(c => !c.test);
        if (failedPasswordConstraint) {
            showErrorModal(failedPasswordConstraint.message);
            return;
        }

        // 5. Password confirmation
        if (password !== confirmPassword) {
            showErrorModal(`<b>Passwords do not match!</b><br>Please make sure both passwords are identical.`);
            return;
        }

        // 6. Date validation
        if (!isValidDate(bDate)) {
            showErrorModal(`<b>Please select a valid birth date!</b><br>Format: YYYY-MM-DD`);
            return;
        }

        // 7. Age validation (must be at least 13 years old)
        const birthDate = new Date(bDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 13) {
            showErrorModal(`<b>You must be at least 13 years old to register!</b><br>Current age: ${age} years`);
            return;
        }

        if (age > 120) {
            showErrorModal(`<b>Please enter a valid birth date!</b>`);
            return;
        }

        // 8. Gender validation
        const validGenders = ['male', 'female', 'custom'];
        if (!validGenders.includes(gender.toLowerCase())) {
            showErrorModal(`<b>Please select a valid gender option!</b>`);
            return;
        }

        // ==================== ALL VALIDATIONS PASSED ====================

        console.log("✅ All validations passed!");

        // Store temporarily for after OTP verification
        authState.tempUserData = {
            firstName,
            lastName,
            email,
            bDate,
            gender,
            password
        };

        console.log("Data being sent:", JSON.stringify(authState.tempUserData));

        // Proceed to OTP verification
        await sendOtp();

    } catch (error) {
        console.error("Registration error:", error);
        showErrorModal(`<b>An unexpected error occurred!</b><br>Please try again later.`);
    }
}

// ==================== HELPER FUNCTIONS ====================

function isValidDate(dateString) {
    try {
        // Check if date string matches YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) {
            return false;
        }

        // Parse the date
        const date = new Date(dateString);
        const timestamp = date.getTime();

        // Check if date is valid and not NaN
        if (isNaN(timestamp)) {
            return false;
        }

        // Check if date components match the input
        const inputParts = dateString.split('-');
        const year = parseInt(inputParts[0], 10);
        const month = parseInt(inputParts[1], 10);
        const day = parseInt(inputParts[2], 10);

        // Validate date ranges
        if (year < 1900 || year > new Date().getFullYear()) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;

        // Check for valid days in month (considering leap years)
        const dateObj = new Date(year, month - 1, day);
        return (
            dateObj.getFullYear() === year &&
            dateObj.getMonth() === (month - 1) &&
            dateObj.getDate() === day
        );
    } catch (error) {
        console.error("Date validation error:", error);
        return false;
    }
}

// Call this when your page loads
document.addEventListener('DOMContentLoaded', function() {
    addErrorModalStyles();

    // Also add validation to password field for real-time feedback
    const passwordField = document.querySelector('#signup-password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
                validatePasswordStrength(this.value);
        });
    }
});

// Optional: Real-time password strength indicator
function validatePasswordStrength(password) {
    const strengthIndicator = document.querySelector('#password-strength');
    if (!strengthIndicator) return;

    let strength = 0;
    let messages = [];

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    // Update UI based on strength
    const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength] || 'Very Weak';
    const strengthColor = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#1e90ff'][strength] || '#ff4757';

    strengthIndicator.textContent = `Password Strength: ${strengthText}`;
    strengthIndicator.style.color = strengthColor;
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


console.log('Using API Base URL:', API_BASE_URL);

// ============================================
// SEND OTP - IMPROVED VERSION
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
        console.log(`Sending OTP request to: ${API_BASE_URL}/auth/send-otp`);
        console.log(`Email: ${email}`);

        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({email})
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Response data:', responseData);

        if (responseData.status === "success") {
            handleOtpSent();
        } else {
            showLoadingModal(responseData.message || "Failed to send OTP.");
            setTimeout(hideLoadingModal, 2000);
        }
    } catch (error) {
        console.error("OTP send error details:", error);
        showLoadingModal("Cannot connect to server. Please check if the backend is running.");
        setTimeout(hideLoadingModal, 3000);
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