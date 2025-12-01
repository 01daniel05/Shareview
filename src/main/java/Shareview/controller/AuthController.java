package Shareview.controller;

import Shareview.dto.OTPVerificationResult;
import Shareview.model.User;
import Shareview.repository.OTPRepository;
import Shareview.repository.UserRepository;
import Shareview.service.AuthService;
import Shareview.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final OTPRepository otpRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AuthService authService;

    @Value("${spring.mail.from:shareview682@gmail.com}")
    private String fromEmail;

    @Autowired
    public AuthController(OTPRepository otpRepository, UserRepository userRepository,
                          EmailService emailService, AuthService authService, JavaMailSender mailSender) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> registerUser(@Valid @RequestBody User user) {
        try {
            // Check if user already exists
            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("status", "error", "message", "This Email is already registered!"));
            }

            // Validate password
            if (user.getPassword() == null || user.getPassword().length() < 6) {
                return ResponseEntity.badRequest()
                        .body(Map.of("status", "error", "message", "Password must be at least 6 characters"));
            }

            // Encode password and save user
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            User savedUser = userRepository.save(user);

            // Send welcome email (optional)
            try {
                emailService.sendTestEmail(savedUser.getEmail());
            } catch (Exception e) {
                // Log but don't fail registration if email fails
                System.err.println("Failed to send welcome email: " + e.getMessage());
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("status", "success", "message", "User registered successfully!", "userId", savedUser.getId().toString()));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Registration failed. Please try again later."));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", "error", "message", "Email is required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Don't reveal if email exists or not (security best practice)
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "If your email is registered, you will receive an OTP shortly."
            ));
        }

        // Send OTP
        emailService.sendOTP(email);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "OTP sent successfully."
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", "error", "message", "Email and OTP are required"));
        }

        OTPVerificationResult result = emailService.verifyOTP(email, otp);

        return ResponseEntity.ok(Map.of(
                "message", result.message(),
                "status", result.success() ? "success" : "fail"
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String newPassword = req.get("newPassword");

        if (email == null || newPassword == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", "error", "message", "Email and new password are required"));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", "error", "message", "Password must be at least 6 characters"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message", "User not found."));
        }

        // Update password
        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Clean up any remaining OTPs
        otpRepository.deleteByEmail(email);

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Password updated successfully."
        ));
    }

    @PostMapping("/signIn")
    public ResponseEntity<Map<String, String>> signIn(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email and password are required!", "status", "error"));
        }

        return authService.authenticateUser(email, password);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOTP(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Email is required", "status", "error"));
            }

            System.out.println("=== SEND OTP ENDPOINT CALLED ===");
            System.out.println("Email: " + email);
            System.out.println("Timestamp: " + LocalDateTime.now());

            emailService.sendOTP(email);

            System.out.println("✅ OTP process completed for: " + email);

            return ResponseEntity.ok(Map.of(
                    "message", "OTP sent successfully!",
                    "status", "success"
            ));

        } catch (Exception e) {
            System.out.println("❌ ERROR in sendOTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send OTP", "status", "error"));
        }
    }

    @GetMapping("/test-email-config")
    public ResponseEntity<Map<String, Object>> testEmailConfig() {
        Map<String, Object> response = new HashMap<>();

        try {
            // Environment info
            response.put("SENDGRID_API_KEY_SET",
                    System.getenv("SENDGRID_API_KEY") != null ? "YES (length: " +
                            System.getenv("SENDGRID_API_KEY").length() + ")" : "NO");

            response.put("FROM_EMAIL", fromEmail);
            response.put("CURRENT_TIME", LocalDateTime.now().toString());

            // Test email sending
            boolean testResult = emailService.sendTestEmail(fromEmail);
            response.put("TEST_EMAIL_SENT", testResult ? "SUCCESS" : "FAILED");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", e.getMessage());
            response.put("stacktrace", e.getStackTrace());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/send-test-email")
    public ResponseEntity<Map<String, String>> sendTestEmail(@RequestBody(required = false) Map<String, String> body) {
        try {
            String testEmail = body != null ? body.get("email") : fromEmail;
            if (testEmail == null) {
                testEmail = fromEmail;
            }

            boolean success = emailService.sendTestEmail(testEmail);

            if (success) {
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "message", "Test email sent to " + testEmail,
                        "timestamp", LocalDateTime.now().toString()
                ));
            } else {
                return ResponseEntity.status(500).body(Map.of(
                        "status", "error",
                        "message", "Failed to send test email to " + testEmail
                ));
            }

        } catch (Exception e) {
            System.out.println("❌ Failed to send test email: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "status", "error",
                    "message", "Failed to send test email: " + e.getMessage(),
                    "error", e.getClass().getSimpleName()
            ));
        }
    }
}