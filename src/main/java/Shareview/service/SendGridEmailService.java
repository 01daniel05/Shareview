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

    @Value("${sendgrid.api-key}")
    private String sendGridApiKey;

    @Value("${app.email.from:shareview682@gmail.com}")
    private String fromEmail;

    @Value("${app.email.sender-name:Shareview}")
    private String senderName;

    private static final Logger logger = LoggerFactory.getLogger(SendGridEmailService.class);

    public void sendOTP(String toEmail, String otp) {
        try {
            // Add validation for API key
            if (sendGridApiKey == null || sendGridApiKey.isEmpty() || sendGridApiKey.equals("apikey")) {
                logger.error("❌ SendGrid API Key is not properly configured!");
                logger.error("API Key value: {}", sendGridApiKey == null ? "null" :
                        sendGridApiKey.isEmpty() ? "empty" : "present but may be incorrect");
                throw new RuntimeException("SendGrid API Key not configured");
            }

            logger.info("Sending OTP via SendGrid to: {}", toEmail);
            logger.info("From: {} <{}>", senderName, fromEmail);
            logger.info("API Key length: {}", sendGridApiKey.length());

            // Log first 8 chars of API key for debugging (not the full key)
            if (sendGridApiKey.length() >= 8) {
                logger.info("API Key starts with: {}", sendGridApiKey.substring(0, 8));
            }

            SendGrid sg = new SendGrid(sendGridApiKey);
            Request request = new Request();

            Email from = new Email(fromEmail, senderName);
            Email to = new Email(toEmail);
            String subject = "Your Shareview Verification Code";

            String htmlContent = buildHtmlEmailContent(otp);
            Content content = new Content("text/html", htmlContent);

            Mail mail = new Mail(from, subject, to, content);

            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);

            int statusCode = response.getStatusCode();
            logger.info("SendGrid response status: {}", statusCode);
            logger.info("SendGrid response body: {}", response.getBody());

            if (statusCode >= 200 && statusCode < 300) {
                logger.info("✅ OTP email sent successfully to: {}", toEmail);
            } else {
                logger.error("❌ Failed to send email. Status: {}, Body: {}",
                        statusCode, response.getBody());
                throw new RuntimeException("Failed to send email via SendGrid. Status: " + statusCode);
            }

        } catch (IOException ex) {
            logger.error("❌ Error sending email via SendGrid: {}", ex.getMessage(), ex);
            throw new RuntimeException("Failed to send email", ex);
        } catch (Exception ex) {
            logger.error("❌ Unexpected error: {}", ex.getMessage(), ex);
            throw ex;
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
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>Do not share this code with anyone</li>
                            <li>Our team will never ask for this code</li>
                            <li>If you didn't request this, please ignore this email</li>
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

    /**
     * Send test email
     */
    public boolean sendTestEmail(String toEmail) {
        try {
            SendGrid sg = new SendGrid(sendGridApiKey);
            Request request = new Request();

            Email from = new Email(fromEmail, senderName);
            Email to = new Email(toEmail);
            String subject = "Test Email from Shareview";
            String textContent = "This is a test email to verify SendGrid Web API configuration.\n\nTimestamp: " + java.time.LocalDateTime.now();

            Content content = new Content("text/plain", textContent);
            Mail mail = new Mail(from, subject, to, content);

            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);

            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                logger.info("✅ Test email sent successfully to: {}", toEmail);
                return true;
            } else {
                logger.error("❌ Failed to send test email. Status: {}, Body: {}",
                        response.getStatusCode(), response.getBody());
                return false;
            }

        } catch (IOException ex) {
            logger.error("❌ Error sending test email: {}", ex.getMessage(), ex);
            return false;
        }
    }
}