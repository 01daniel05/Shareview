package Shareview.service;

import Shareview.dto.OTPVerificationResult;
import Shareview.model.OTP;
import Shareview.repository.OTPRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final OTPRepository otpRepository;
    private final SendGridEmailService sendGridEmailService;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.sender-name}")
    private String senderName;

    @Autowired
    public EmailService(OTPRepository otpRepository,
                        SendGridEmailService sendGridEmailService) {
        this.otpRepository = otpRepository;
        this.sendGridEmailService = sendGridEmailService;
        logConfiguration();
    }

    /**
     * Log configuration on startup
     */
    private void logConfiguration() {
        logger.info("=== EMAIL SERVICE CONFIGURATION ===");
        logger.info("From Email: {}", fromEmail);
        logger.info("Sender Name: {}", senderName);
        logger.info("================================");
    }

    /**
     * Send OTP via SendGrid Web API
     */
    public void sendOTP(String email) {
        logger.info("=== SENDING OTP START ===");
        logger.info("Recipient: {}", email);

        try {
            // Generate OTP
            String otp = generateOTP();
            logger.info("Generated OTP: {}", otp);

            // Delete any existing OTP for this email
            otpRepository.findByEmail(email).ifPresent(otpRepository::delete);
            logger.info("Cleaned up existing OTPs");

            // Save new OTP to database
            OTP otpEntity = new OTP();
            otpEntity.setEmail(email);
            otpEntity.setOtpCode(otp);
            otpEntity.setExpiresAt(LocalDateTime.now().plusMinutes(5));
            otpRepository.save(otpEntity);
            logger.info("OTP saved to database");

            // Send email via SendGrid Web API
            logger.info("Attempting to send via Mailjet...");
            sendGridEmailService.sendOTP(email, otp);

            logger.info("OTP sent successfully to: {}", email);

        } catch (Exception e) {
            logger.error("Failed to process OTP request: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send OTP email", e);
        } finally {
            logger.info("=== SENDING OTP END ===");
        }
    }

    /**
     * Verify OTP
     */
    public OTPVerificationResult verifyOTP(String email, String otp) {
        try {
            Optional<OTP> storedOtp = otpRepository.findByEmail(email);

            if (storedOtp.isEmpty()) {
                logger.warn("No OTP found for email: {}", email);
                return new OTPVerificationResult(false, "No OTP found. Please request a new one.");
            }

            OTP otpRecord = storedOtp.get();

            // Check if expired
            if (LocalDateTime.now().isAfter(otpRecord.getExpiresAt())) {
                otpRepository.delete(otpRecord);
                logger.warn("OTP expired for email: {}", email);
                return new OTPVerificationResult(false, "OTP has expired. Please request a new one.");
            }

            // Verify OTP
            if (otpRecord.getOtpCode().equals(otp)) {
                otpRepository.delete(otpRecord);
                logger.info("OTP verified successfully for email: {}", email);
                return new OTPVerificationResult(true, "OTP verified successfully.");
            } else {
                logger.warn("Invalid OTP entered for email: {}", email);
                return new OTPVerificationResult(false, "Invalid OTP. Please try again.");
            }

        } catch (Exception e) {
            logger.error("Error verifying OTP: {}", e.getMessage(), e);
            return new OTPVerificationResult(false, "Error verifying OTP. Please try again.");
        }
    }

    /**
     * Generate 6-digit OTP
     */
    private String generateOTP() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    /**
     * Clean up expired OTPs (scheduled task)
     */
    @Scheduled(fixedRate = 300000) // Run every 5 minutes
    public void cleanupExpiredOTPs() {
        try {
            LocalDateTime now = LocalDateTime.now();
            int deletedCount = otpRepository.deleteAllByExpiresAtBefore(now);
            if (deletedCount > 0) {
                logger.info("Cleaned up {} expired OTPs", deletedCount);
            }
        } catch (Exception e) {
            logger.error("Error cleaning up expired OTPs: {}", e.getMessage());
        }
    }

    /**
     * Test email sending
     */
    public boolean sendTestEmail(String toEmail) {
        return sendGridEmailService.sendTestEmail(toEmail);
    }
}