package Shareview.service;

import Shareview.dto.OTPVerificationResult;
import Shareview.model.OTP;
import Shareview.repository.OTPRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Properties;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;
    private final OTPRepository otpRepository;

    @Value("${spring.mail.from:shareview682@gmail.com}")
    private String fromEmail;

    @Value("${spring.mail.username:apikey}")
    private String mailUsername;

    @Autowired
    public EmailService(JavaMailSender mailSender, OTPRepository otpRepository) {
        this.mailSender = mailSender;
        this.otpRepository = otpRepository;
        logMailConfiguration();
        testEmailConnection();
    }

    /**
     * Log mail configuration on startup
     */
    private void logMailConfiguration() {
        logger.info("=== MAIL CONFIGURATION ===");
        logger.info("Mail From: {}", fromEmail);
        logger.info("Mail Username: {}", mailUsername);

        if (mailSender instanceof JavaMailSenderImpl) {
            JavaMailSenderImpl impl = (JavaMailSenderImpl) mailSender;
            logger.info("Actual Host: {}", impl.getHost());
            logger.info("Actual Port: {}", impl.getPort());
            logger.info("Actual Username: {}", impl.getUsername());

            // Log JavaMail properties
            Properties props = impl.getJavaMailProperties();
            logger.info("SMTP Auth: {}", props.getProperty("mail.smtp.auth"));
            logger.info("StartTLS Enabled: {}", props.getProperty("mail.smtp.starttls.enable"));
        }
        logger.info("==========================");
    }

    /**
     * Test email connection on startup
     */
    private void testEmailConnection() {
        try {
            if (mailSender instanceof JavaMailSenderImpl) {
                JavaMailSenderImpl impl = (JavaMailSenderImpl) mailSender;
                impl.testConnection();
                logger.info("✅ Email connection test successful");
            }
        } catch (MessagingException e) {
            logger.error("❌ Email connection test failed: {}", e.getMessage());
        }
    }

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

            // Send email
            sendOTPEmail(email, otp);

            logger.info("✅ OTP sent successfully to: {}", email);

        } catch (Exception e) {
            logger.error("❌ Failed to process OTP request: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send OTP email", e);
        } finally {
            logger.info("=== SENDING OTP END ===");
        }
    }

    /**
     * Send OTP email with HTML and plain text fallback
     */
    private void sendOTPEmail(String email, String otp) {
        try {
            // Try HTML email first
            sendHtmlEmail(email, otp);
            logger.info("✅ HTML email sent successfully");

        } catch (Exception htmlException) {
            logger.warn("HTML email failed, falling back to plain text: {}", htmlException.getMessage());

            try {
                sendPlainTextEmail(email, otp);
                logger.info("✅ Plain text email sent successfully");
            } catch (Exception plainException) {
                logger.error("❌ Both HTML and plain text email failed", plainException);
                throw new RuntimeException("Failed to send email", plainException);
            }
        }
    }

    /**
     * Send HTML email
     */
    private void sendHtmlEmail(String email, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // Set from address with display name, catch encoding exception
            try {
                helper.setFrom(fromEmail, "ShareView");
            } catch (java.io.UnsupportedEncodingException e) {
                // Encoding issue, fallback to simple from
                logger.debug("Encoding issue with display name, using simple from: {}", e.getMessage());
                helper.setFrom(fromEmail);
            }

            helper.setTo(email);
            helper.setSubject("Your ShareView Verification Code");

            String htmlContent = buildHtmlEmailContent(otp);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.debug("HTML email sent successfully to: {}", email);

        } catch (MessagingException e) {
            logger.error("Failed to send HTML email to {}: {}", email, e.getMessage());
            throw new RuntimeException("Failed to send HTML email", e);
        }
    }
    /**
     * Send plain text email
     */
    private void sendPlainTextEmail(String email, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(email);
        message.setSubject("Your ShareView Verification Code");
        message.setText(
                "Your ShareView Verification Code\n\n" +
                        "Code: " + otp + "\n\n" +
                        "This code expires in 5 minutes.\n\n" +
                        "🔒 Security Notice:\n" +
                        "• Do not share this code with anyone\n" +
                        "• Our team will never ask for this code\n" +
                        "• If you didn't request this, please ignore this email\n\n" +
                        "Thank you,\n" +
                        "The ShareView Team\n\n" +
                        "---\n" +
                        "Need help? Contact: support@shareview.com"
        );

        mailSender.send(message);
    }

    /**
     * Build HTML email content
     */
    private String buildHtmlEmailContent(String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #4F46E5; margin: 0; }
                    .otp-container { text-align: center; margin: 30px 0; }
                    .otp-code { display: inline-block; background: #f8f9fa; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; border-radius: 8px; border: 2px dashed #dee2e6; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>ShareView</h1>
                        <p>Account Verification</p>
                    </div>
                    
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    
                    <div class="otp-container">
                        <div class="otp-code">%s</div>
                    </div>
                    
                    <p>This code expires in <strong>5 minutes</strong>.</p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>Do not share this code with anyone</li>
                            <li>Our team will never ask for this code</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                    </div>
                    
                    <p>Need help? <a href="mailto:support@shareview.com">Contact our support team</a></p>
                    
                    <div class="footer">
                        <p>© 2024 ShareView. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(otp);
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
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Test Email from ShareView");
            message.setText("This is a test email to verify SendGrid configuration.\n\nTimestamp: " + LocalDateTime.now());

            mailSender.send(message);
            logger.info("✅ Test email sent to: {}", toEmail);
            return true;

        } catch (MailException e) {
            logger.error("❌ Failed to send test email: {}", e.getMessage(), e);
            return false;
        }
    }
}