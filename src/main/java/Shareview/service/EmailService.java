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

    // Method to send OTP
    public void sendOTP(String email) {
        try {
            String otp = generateOTP();
            LOGGER.info("Generated OTP: " + otp);

            Optional<OTP> existingOtp = otpRepository.findByEmail(email);
            existingOtp.ifPresent(otpRepository::delete);

            if (!otpRepository.findAll().isEmpty()) {
                deleteExpiredOTPs();
            }

            OTP otpEntity = new OTP();
            otpEntity.setEmail(email);
            otpEntity.setOtpCode(otp);
            otpEntity.setExpiresAt(LocalDateTime.now().plusMinutes(2));
            otpRepository.save(otpEntity);

            sendEmail(email, otp);
        } catch (Exception e) {
            LOGGER.severe("Failed to send OTP email: " + e.getMessage());
            throw new RuntimeException("Error sending OTP. Please try again.");
        }
    }

    // Method to verify OTP
    public OTPVerificationResult verifyOTP(String email, String otp) {
        Optional<OTP> storedOtp = otpRepository.findByEmail(email);

        if (storedOtp.isEmpty()) {
            LOGGER.warning("No OTP found for email: " + email);
            return new OTPVerificationResult(false, "No OTP found. Please request a new one.");
        }

        // Only delete expired if any OTPs exist
        if (!otpRepository.findAll().isEmpty()) {
            deleteExpiredOTPs();
        }

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
    }
    // Helper method to generate a secure 6-digit OTP
    private String generateOTP() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private void sendEmail(String email, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Your OTP Code");
            message.setText("Your OTP Code is: " + otp + "\nIt expires in 2 minutes.");

            mailSender.send(message);
            LOGGER.info("OTP email sent successfully to: " + email);
        } catch (Exception e) {
            LOGGER.severe("Failed to send OTP email: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error sending OTP. Please try again.");
        }
    }

    // Just a helper method now — no annotation!
    public void deleteExpiredOTPs() {
        LocalDateTime now = LocalDateTime.now();
        otpRepository.deleteAllByExpiresAtBefore(now);
        LOGGER.info("Expired OTPs deleted at " + now);
    }

}
