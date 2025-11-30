package Shareview.repository;

import Shareview.model.OTP;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OTPRepository extends JpaRepository<OTP, Long> {
    Optional<OTP> findByEmail(String email);

    void deleteByEmail(String email);

    // Custom method to delete OTPs that have expired
    void deleteAllByExpiresAtBefore(LocalDateTime now);}

