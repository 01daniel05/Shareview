package Shareview.controller;

import Shareview.dto.OTPVerificationResult;
import Shareview.model.User;
import Shareview.repository.OTPRepository;
import Shareview.repository.UserRepository;
import Shareview.service.AuthService;
import Shareview.service.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

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

    public AuthController(OTPRepository otpRepository, UserRepository userRepository, EmailService emailService, AuthService authService) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.authService = authService;
    }



    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> registerUser(@RequestBody User user) {
        try {
            // DEBUG: Check the incoming data
            System.out.println("=== REGISTRATION DEBUG ===");
            System.out.println("First Name: " + user.getFirstName());
            System.out.println("Last Name: " + user.getLastName());
            System.out.println("Email: " + user.getEmail());
            System.out.println("Birthday: " + user.getBDate());
            System.out.println("Gender: " + user.getGender());
            System.out.println("Password present: " + (user.getPassword() != null));
            System.out.println("=========================");

            Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
            if (existingUser.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("status", "error", "message", "This Email is already registered!"));
            }

            user.setPassword(passwordEncoder.encode(user.getPassword()));
            User savedUser = userRepository.save(user);

            System.out.println("Saved user birthday: " + savedUser.getBDate());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("status", "success", "message", "User registered successfully!"));
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
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Email is required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("status", "error", "message", "Email not found."));
        }

        emailService.sendOTP(email);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "OTP sent successfully."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String newPassword = req.get("newPassword");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("status", "error", "message", "User not found."));
        }

        // Delete any existing OTP or reset token before updating password
        otpRepository.deleteByEmail(email);

        // Update the password
        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("status", "success", "message", "Password updated."));
    }

    @PostMapping("/signIn")
    public ResponseEntity<Map<String, String>> signIn(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email and password are required!", "status", "error"));
        }

        // Find the user by email once
        return authService.authenticateUser(email, password);

    }

    @PostMapping("/create-account")
    @ResponseBody // Responds with plain text
    public String createAccount() {
        System.out.println("Account created!");
        return "Account successfully created!";
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOTP(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Email is required", "status", "error"));
            }
            System.out.println("Sending OTP to email: " + email);
            emailService.sendOTP(email);
            System.out.println("Sending OTP to email: " + email);

            return ResponseEntity.ok(Map.of("message", "OTP sent!", "status", "success"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send OTP: " + e.getMessage(), "status", "error"));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        OTPVerificationResult result = emailService.verifyOTP(email, otp);

        return ResponseEntity.ok(Map.of(
                "message", result.message(),
                "status", result.success() ? "success" : "fail"
        ));
    }
}

