package Shareview.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class GmailEmailService {

    private static final Logger logger = LoggerFactory.getLogger(GmailEmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.sender-name}")
    private String senderName;

    public GmailEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOTP(String toEmail, String otp) {
        logger.info("Sending OTP via Gmail SMTP to: {}", toEmail);

        sendEmail(
                toEmail,
                "Your Shareview Verification Code",
                buildHtmlEmailContent(otp)
        );

        logger.info("OTP email sent successfully to: {}", toEmail);
    }

    public boolean sendTestEmail(String toEmail) {
        try {
            sendEmail(
                    toEmail,
                    "Test Email from Shareview",
                    "<p>This is a test email to verify Gmail SMTP configuration.<br/>"
                            + "Timestamp: " + java.time.LocalDateTime.now() + "</p>"
            );

            logger.info("Test email sent successfully to: {}", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send test email", e);
            return false;
        }
    }

    private void sendEmail(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, senderName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);

        } catch (Exception e) {
            logger.error("Error sending email via Gmail SMTP", e);
            throw new RuntimeException("Failed to send email via Gmail SMTP", e);
        }
    }

    private String buildHtmlEmailContent(String otp) {
        return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 20px;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 10px;
                            padding: 30px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .header h1 {
                            color: #4F46E5;
                            margin: 0;
                        }
                        .otp-container {
                            text-align: center;
                            margin: 30px 0;
                        }
                        .otp-code {
                            display: inline-block;
                            background: #f8f9fa;
                            padding: 15px 30px;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            color: #4F46E5;
                            border-radius: 8px;
                            border: 2px dashed #dee2e6;
                        }
                        .footer {
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #eee;
                            font-size: 12px;
                            color: #666;
                            text-align: center;
                        }
                        .warning {
                            background: #fff3cd;
                            border: 1px solid #ffeaa7;
                            border-radius: 5px;
                            padding: 15px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Shareview</h1>
                            <p>Account Verification</p>
                        </div>

                        <p>Hello,</p>
                        <p>Your verification code is:</p>

                        <div class="otp-container">
                            <div class="otp-code">%s</div>
                        </div>

                        <p>This code expires in <strong>5 minutes</strong>.</p>

                        <div class="warning">
                            <strong>Security Notice:</strong>
                            <ul>
                                <li>Do not share this code with anyone</li>
                                <li>Our team will never ask for this code</li>
                                <li>If you did not request this, please ignore this email</li>
                            </ul>
                        </div>

                        <p>Need help? <a href="mailto:support@shareview.com">Contact our support team</a></p>

                        <div class="footer">
                            <p>© 2024 Shareview. All rights reserved.</p>
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
                """, otp);
    }
}