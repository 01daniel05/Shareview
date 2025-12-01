package Shareview.service;

import Shareview.dto.OTPVerificationResult;
import Shareview.model.OTP;
import Shareview.repository.OTPRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final OTPRepository otpRepository;

    @Autowired
    public EmailService(JavaMailSender mailSender, OTPRepository otpRepository) {
        this.mailSender = mailSender;
        this.otpRepository = otpRepository;
    }

    private static final Logger LOGGER = Logger.getLogger(EmailService.class.getName());
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public void sendOTP(String email) {
        try {
            // Generate OTP
            String otp = generateOTP();

            // Log to console (for demo)
            LOGGER.info("📧 OTP for " + email + ": " + otp);

            // Delete any existing OTP for this email
            Optional<OTP> existingOtp = otpRepository.findByEmail(email);
            existingOtp.ifPresent(otpRepository::delete);

            // Save new OTP to database
            OTP otpEntity = new OTP();
            otpEntity.setEmail(email);
            otpEntity.setOtpCode(otp);
            otpEntity.setExpiresAt(LocalDateTime.now().plusMinutes(5));
            otpRepository.save(otpEntity);

            LOGGER.info("OTP saved to database for: " + email);

            // Try to send email
            try {
                sendEmail(email, otp);
                LOGGER.info("Email sent successfully to: " + email);
            } catch (Exception emailError) {
                // Email failed, but OTP is still saved to database
                LOGGER.warning("Email sending failed, but OTP saved to database: " + emailError.getMessage());
                // Don't throw - continue without email
            }

        } catch (Exception e) {
            LOGGER.severe("Failed to generate OTP: " + e.getMessage());
            // Don't throw - just log for demo
        }
    }
    // Method to verify OTP
    public OTPVerificationResult verifyOTP(String email, String otp) {
        try {
            Optional<OTP> storedOtp = otpRepository.findByEmail(email);

            if (storedOtp.isEmpty()) {
                LOGGER.warning("No OTP found for email: " + email);
                return new OTPVerificationResult(false, "No OTP found. Please request a new one.");
            }

            // Clean up expired OTPs first
            deleteExpiredOTPs();

            OTP otpRecord = storedOtp.get();
            LOGGER.info("Checking OTP for email: " + email);

            if (LocalDateTime.now().isAfter(otpRecord.getExpiresAt())) {
                otpRepository.delete(otpRecord);
                LOGGER.warning("OTP expired for email: " + email);
                return new OTPVerificationResult(false, "OTP has expired. Please request a new one.");
            }

            if (otpRecord.getOtpCode().equals(otp)) {
                otpRepository.delete(otpRecord);
                LOGGER.info("OTP verified successfully for email: " + email);
                return new OTPVerificationResult(true, "OTP verified successfully.");
            } else {
                LOGGER.warning("Invalid OTP entered for email: " + email);
                return new OTPVerificationResult(false, "Invalid OTP. Please try again.");
            }
        } catch (Exception e) {
            LOGGER.severe("Error verifying OTP: " + e.getMessage());
            return new OTPVerificationResult(false, "Error verifying OTP. Please try again.");
        }
    }

    // Helper method to generate a secure 6-digit OTP
    private String generateOTP() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }


    private void sendEmail(String email, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("ganadskie29@gmail.com");  // Your Gmail
            message.setTo(email);
            message.setSubject("Your OTP Code - ShareView");
            message.setText(
                    "Your OTP Code is: " + otp + "\n\n" +
                            "It expires in 5 minutes.\n\n" +
                            "Do not share this code with anyone.\n\n" +
                            "Thank you,\n" +
                            "ShareView Team"
            );

            mailSender.send(message);
            LOGGER.info("📧 Email sent to: " + email);

        } catch (Exception e) {
            LOGGER.severe("Email sending failed: " + e.getMessage());
            throw new RuntimeException("Email failed: " + e.getMessage());
        }
    }    public void deleteExpiredOTPs() {
        try {
            LocalDateTime now = LocalDateTime.now();
            otpRepository.deleteAllByExpiresAtBefore(now);
            LOGGER.info("Expired OTPs cleaned up");
        } catch (Exception e) {
            LOGGER.warning("Error deleting expired OTPs: " + e.getMessage());
        }
    }
}