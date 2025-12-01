package Shareview.service;

import Shareview.dto.OTPVerificationResult;
import Shareview.model.OTP;
import Shareview.repository.OTPRepository;
import com.sendgrid.*;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class EmailService {

    private final OTPRepository otpRepository;

    @Value("${sendgrid.api.key}")
    private String sendGridApiKey;

    @Autowired
    public EmailService(OTPRepository otpRepository) {
        this.otpRepository = otpRepository;
    }

    private static final Logger LOGGER = Logger.getLogger(EmailService.class.getName());
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public void sendOTP(String email) {
        try {
            // 1. Generate and save OTP
            String otp = generateOTP();
            LOGGER.info("Generated OTP: " + otp);

            // Delete any existing OTP for this email
            otpRepository.deleteByEmail(email);
            deleteExpiredOTPs();

            // Save new OTP to database
            OTP otpEntity = new OTP();
            otpEntity.setEmail(email);
            otpEntity.setOtpCode(otp);
            otpEntity.setExpiresAt(LocalDateTime.now().plusMinutes(2));
            otpRepository.save(otpEntity);
            LOGGER.info("OTP saved to database for: " + email);

            // 2. Send email via SendGrid
            sendEmailViaSendGrid(email, otp);

        } catch (Exception e) {
            LOGGER.severe("Failed to send OTP: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error sending OTP. Please try again.");
        }
    }

    private void sendEmailViaSendGrid(String toEmail, String otp) {
        try {
            LOGGER.info("Preparing to send email via SendGrid to: " + toEmail);

            // Check if API key is configured
            if (sendGridApiKey == null || sendGridApiKey.isEmpty()) {
                LOGGER.severe("SendGrid API key is not configured!");
                throw new RuntimeException("SendGrid API key is not configured");
            }

            // Create email
            Email from = new Email("noreply@shareview.com", "ShareView");
            Email to = new Email(toEmail);
            String subject = "Your OTP Code - ShareView";
            Content content = new Content("text/plain",
                    "Your OTP Code is: " + otp + "\n\n" +
                            "It expires in 2 minutes.\n\n" +
                            "Do not share this code with anyone.\n\n" +
                            "- ShareView Team");

            Mail mail = new Mail(from, subject, to, content);

            // Configure SendGrid
            SendGrid sg = new SendGrid(sendGridApiKey);
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            // Send email
            LOGGER.info("Sending email via SendGrid...");
            Response response = sg.api(request);

            LOGGER.info("SendGrid response status: " + response.getStatusCode());
            LOGGER.info("SendGrid response body: " + response.getBody());

            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                LOGGER.info("✅ Email sent successfully via SendGrid to: " + toEmail);
            } else {
                LOGGER.severe("❌ SendGrid returned error: " + response.getStatusCode());
                throw new RuntimeException("SendGrid failed with status: " + response.getStatusCode());
            }

        } catch (IOException ex) {
            LOGGER.severe("❌ Error sending email via SendGrid: " + ex.getMessage());
            ex.printStackTrace();
            throw new RuntimeException("Failed to send email via SendGrid: " + ex.getMessage());
        }
    }

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
                LOGGER.info("✅ OTP verified successfully for email: " + email);
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

    private String generateOTP() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    public void deleteExpiredOTPs() {
        try {
            LocalDateTime now = LocalDateTime.now();
            otpRepository.deleteAllByExpiresAtBefore(now);
            LOGGER.info("Expired OTPs cleaned up");
        } catch (Exception e) {
            LOGGER.warning("Error deleting expired OTPs: " + e.getMessage());
        }
    }
}