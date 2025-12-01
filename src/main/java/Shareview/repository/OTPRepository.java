package Shareview.repository;

import Shareview.model.OTP;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface OTPRepository extends JpaRepository<OTP, Long> {
    Optional<OTP> findByEmail(String email);

    // Custom method to delete by email with explicit transaction
    @Modifying
    @Transactional
    @Query("DELETE FROM OTP o WHERE o.email = ?1")
    void deleteByEmail(String email);

    // Custom method to delete expired OTPs with explicit transaction
    @Modifying
    @Transactional
    @Query("DELETE FROM OTP o WHERE o.expiresAt < ?1")
    void deleteAllByExpiresAtBefore(LocalDateTime now);
}