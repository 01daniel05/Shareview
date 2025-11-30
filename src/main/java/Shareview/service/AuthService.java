package Shareview.service;

import Shareview.model.User;
import Shareview.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public ResponseEntity<Map<String, String>> authenticateUser(String email, String password) {
        // Find the user by email once
        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "message", "User logged in successfully!",
                        "role", user.getRole(),
                        "id", String.valueOf(user.getId()),
                        "firstName", user.getFirstName(),
                        "lastName", user.getLastName()

                ));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("status", "error", "message", "Invalid password!"));
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("status", "error", "message", "User not found!"));
    }
}



