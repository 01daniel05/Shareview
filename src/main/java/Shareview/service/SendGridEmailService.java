package Shareview.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class SendGridEmailService {

    private static final Logger logger = LoggerFactory.getLogger(SendGridEmailService.class);

    @Value("${sendgrid.api.key:}")
    private String apiKey;

    @Value("${sendgrid.from.email:shareview682@gmail.com}")
    private String fromEmail;

    @Value("${sendgrid.from.name:Shareview}")
    private String fromName;

    private SendGrid sendGrid;

    private SendGrid getSendGrid() {
        if (sendGrid == null && apiKey != null && !apiKey.isEmpty()) {
            sendGrid = new SendGrid(apiKey);
        }
        return sendGrid;
    }

    private boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty() && apiKey.startsWith("SG.");
    }

    public void sendOTP(String toEmail, String otp) {
        logger.info("Sending OTP via SendGrid to: {}", toEmail);

        if (!isConfigured()) {
            logger.warn("SendGrid not configured. Skipping email to: {}", toEmail);
            logger.info("OTP would be: {}", otp);
            return;
        }

        try {
            sendEmail(toEmail, "Your Shareview Verification Code", buildHtmlEmailContent(otp));
            logger.info("OTP email sent successfully to: {}", toEmail);
        } catch (IOException e) {
            logger.error("Failed to send OTP email: {}", e.getMessage());
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        }
    }

    public boolean sendTestEmail(String toEmail) {
        if (!isConfigured()) {
            logger.warn("SendGrid not configured. Skipping test email.");
            return false;
        }

        try {
            sendEmail(toEmail, "Test Email from Shareview",
                    "<p>This is a test email to verify SendGrid configuration.<br/>"
                            + "Timestamp: " + java.time.LocalDateTime.now() + "</p>"
            );
            logger.info("Test email sent successfully to: {}", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send test email: {}", e.getMessage());
            return false;
        }
    }

    private void sendEmail(String to, String subject, String html) throws IOException {
        SendGrid sg = getSendGrid();
        if (sg == null) {
            throw new RuntimeException("SendGrid not initialized. Check API key.");
        }

        Email from = new Email(fromEmail, fromName);
        Email toEmail = new Email(to);
        Content content = new Content("text/html", html);
        Mail mail = new Mail(from, subject, toEmail, content);

        Request request = new Request();
        request.setMethod(Method.POST);
        request.setEndpoint("mail/send");
        request.setBody(mail.build());

        Response response = sg.api(request);

        if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
            logger.info("Email sent successfully. Status: {}", response.getStatusCode());
        } else {
            logger.error("Failed to send email. Status: {}, Body: {}",
                    response.getStatusCode(), response.getBody());
            throw new RuntimeException("SendGrid error: " + response.getBody());
        }
    }

    private String buildHtmlEmailContent(String otp) {
        return String.format("""
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
                    <div class="header"><h1>Shareview</h1><p>Account Verification</p></div>
                    <p>Hello,</p>
                    <p>Your verification code is:</p>
                    <div class="otp-container"><div class="otp-code">%s</div></div>
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
                    <div class="footer"><p>© 2024 Shareview. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div>
                </div>
            </body>
            </html>
            """, otp);
    }
}