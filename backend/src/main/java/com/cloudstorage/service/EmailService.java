package com.cloudstorage.service;

import com.cloudstorage.model.User.OtpPurpose;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:Cloud Storage}")
    private String appName;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    // OTP email subjects map
    private static final Map<OtpPurpose, String> OTP_SUBJECTS = Map.of(
            OtpPurpose.LOGIN, "Login Verification Code",
            OtpPurpose.REGISTER, "Welcome! Verify Your Email",
            OtpPurpose.EMAIL_CHANGE, "Email Change Verification"
    );

    // OTP email messages map
    private static final Map<OtpPurpose, String> OTP_MESSAGES = Map.of(
            OtpPurpose.LOGIN, "Your login verification code is:",
            OtpPurpose.REGISTER, "Welcome! Your email verification code is:",
            OtpPurpose.EMAIL_CHANGE, "Your email change verification code is:"
    );

    /**
     * Send OTP email with HTML template
     */
    public void sendOTPEmail(String email, String otp, OtpPurpose purpose) {
        validateEmailParams(email, otp);
        
        try {
            MimeMessageHelper helper = createMimeMessageHelper(
                email, 
                OTP_SUBJECTS.getOrDefault(purpose, "Verification Code")
            );

            String htmlContent = buildOTPEmailTemplate(otp, purpose);
            helper.setText(htmlContent, true);

            mailSender.send(helper.getMimeMessage());
            log.info("OTP email sent to: {} for purpose: {}", email, purpose);

        } catch (MessagingException e) {
            log.error("Error sending OTP email to {}: {}", email, e.getMessage());
            throw new RuntimeException("Failed to send OTP email", e);
        }
    }

    /**
     * Build HTML template for OTP email
     */
    private String buildOTPEmailTemplate(String otp, OtpPurpose purpose) {
        String message = OTP_MESSAGES.getOrDefault(purpose, "Your verification code is:");

        return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb; margin-top: 0;">%s</h2>
                        <p style="color: #1f2937; font-size: 16px;">%s</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h1 style="text-align: center; color: #1f2937; letter-spacing: 5px; margin: 0; font-size: 32px;">%s</h1>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">This code will expire in %d minutes.</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">If you didn't request this code, please ignore this email.</p>
                    </div>
                </body>
                </html>
                """,
                appName,
                message,
                otp,
                otpExpiryMinutes
        );
    }

    /**
     * Send HTML email for file sharing with enhanced formatting
     */
    public void sendFileShareEmail(String recipientEmail, String recipientName, String sharedByUsername, 
                                   String sharedByEmail, String fileName, String permission, String downloadLink) {
        validateEmailParams(recipientEmail, fileName);
        
        try {
            String subject = String.format("%s shared \"%s\" with you", sharedByUsername, fileName);
            MimeMessageHelper helper = createMimeMessageHelper(recipientEmail, subject);

            String htmlContent = buildFileShareEmailTemplate(
                recipientName, sharedByUsername, sharedByEmail, fileName, permission, downloadLink
            );
            helper.setText(htmlContent, true);

            mailSender.send(helper.getMimeMessage());
            log.info("File share email sent to: {}", recipientEmail);

        } catch (MessagingException e) {
            log.error("Error sending file share email to {}: {}", recipientEmail, e.getMessage());
            throw new RuntimeException("Failed to send file share email", e);
        }
    }

    /**
     * Build HTML template for file share email
     */
    private String buildFileShareEmailTemplate(String recipientName, String sharedByUsername, 
                                               String sharedByEmail, String fileName, 
                                               String permission, String downloadLink) {
        return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb; margin-top: 0;">%s</h2>
                        
                        <p style="color: #1f2937; font-size: 16px; margin: 20px 0;">Hello %s,</p>
                        
                        <p style="color: #1f2937; font-size: 16px; margin: 20px 0;">
                            <strong>%s</strong> (<a href="mailto:%s" style="color: #2563eb; text-decoration: none;">%s</a>) has shared a file with you.
                        </p>
                        
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 8px 0; color: #1f2937; font-size: 15px;">
                                <strong>File:</strong> %s
                            </p>
                            <p style="margin: 8px 0; color: #1f2937; font-size: 15px;">
                                <strong>Permission:</strong> %s
                            </p>
                        </div>
                        
                        <p style="color: #1f2937; font-size: 16px; margin: 20px 0;">
                            Access the file at: <a href="%s" style="color: #2563eb; text-decoration: none; word-break: break-all;">%s</a>
                        </p>
                        
                        <div style="margin: 30px 0;">
                            <p style="color: #1f2937; font-size: 16px; margin-bottom: 10px;">Best regards,</p>
                            <p style="color: #1f2937; font-size: 16px; margin-top: 0;">Cloud Storage Team</p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                            If you have any questions, please contact the person who shared this file with you.
                        </p>
                    </div>
                </body>
                </html>
                """,
                appName,
                recipientName,
                sharedByUsername,
                sharedByEmail,
                sharedByEmail,
                fileName,
                permission,
                downloadLink,
                downloadLink
        );
    }

    /**
     * Send HTML email for folder sharing with enhanced formatting
     */
    public void sendFolderShareEmail(String recipientEmail, String sharedByUsername,
                                    String folderName, String permission) {
        validateEmailParams(recipientEmail, folderName);
        
        try {
            String subject = "Folder shared with you";
            MimeMessageHelper helper = createMimeMessageHelper(recipientEmail, subject);

            String htmlContent = buildFolderShareEmailTemplate(
                sharedByUsername, folderName, permission
            );
            helper.setText(htmlContent, true);

            mailSender.send(helper.getMimeMessage());
            log.info("Folder share email sent to: {}", recipientEmail);

        } catch (MessagingException e) {
            log.error("Error sending folder share email to {}: {}", recipientEmail, e.getMessage());
            throw new RuntimeException("Failed to send folder share email", e);
        }
    }

    /**
     * Build HTML template for folder share email
     */
    private String buildFolderShareEmailTemplate(String sharedByUsername, 
                                                 String folderName, String permission) {
        return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb; margin-top: 0;">%s</h2>
                        
                        <p style="color: #1f2937; font-size: 16px; margin: 20px 0;">
                            %s shared the folder <strong>"%s"</strong> with %s access.
                        </p>
                        
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 8px 0; color: #1f2937; font-size: 15px;">
                                <strong>Folder:</strong> %s
                            </p>
                            <p style="margin: 8px 0; color: #1f2937; font-size: 15px;">
                                <strong>Permission:</strong> %s
                            </p>
                        </div>
                        
                        <div style="margin: 30px 0;">
                            <p style="color: #1f2937; font-size: 16px; margin-bottom: 10px;">Best regards,</p>
                            <p style="color: #1f2937; font-size: 16px; margin-top: 0;">Cloud Storage Team</p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                            If you have any questions, please contact the person who shared this folder with you.
                        </p>
                    </div>
                </body>
                </html>
                """,
                appName,
                sharedByUsername,
                folderName,
                permission.toLowerCase(),
                folderName,
                permission
        );
    }

    /**
     * Helper method to create MimeMessageHelper
     */
    private MimeMessageHelper createMimeMessageHelper(String to, String subject) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(String.format("\"%s\" <%s>", appName, fromEmail));
        helper.setTo(to);
        helper.setSubject(subject);
        return helper;
    }

    /**
     * Validate email parameters
     */
    private void validateEmailParams(String email, String content) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Content cannot be null or empty");
        }
    }
}