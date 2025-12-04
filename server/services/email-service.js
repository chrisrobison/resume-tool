// email-service.js - Email service for verification, password resets, notifications
// Uses nodemailer with SMTP or SendGrid

const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor(db) {
        this.db = db;
        this.transporter = null;
        this.from = process.env.EMAIL_FROM || 'noreply@nextrole.app';
        this.appName = process.env.APP_NAME || 'NextRole';
        this.appUrl = process.env.APP_URL || 'http://localhost:3000';
    }

    /**
     * Initialize email transporter
     */
    async initialize() {
        try {
            const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

            if (emailProvider === 'sendgrid') {
                // SendGrid configuration
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.sendgrid.net',
                    port: 587,
                    auth: {
                        user: 'apikey',
                        pass: process.env.SENDGRID_API_KEY
                    }
                });
            } else {
                // Generic SMTP configuration
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD
                    }
                });
            }

            // Verify connection
            await this.transporter.verify();
            console.log('✅ Email service initialized');
            return true;

        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            console.log('⚠️ Emails will be logged to console only');
            this.transporter = null;
            return false;
        }
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(userId, email) {
        try {
            // Generate verification token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Store token in database
            await this.db.pool.execute(
                `INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
                 VALUES (?, ?, 'email_verification', ?)
                 ON DUPLICATE KEY UPDATE token = ?, expires_at = ?`,
                [userId, token, expiresAt, token, expiresAt]
            );

            // Generate verification URL
            const verificationUrl = `${this.appUrl}/verify-email?token=${token}`;

            // Email content
            const subject = `Verify your ${this.appName} account`;
            const html = this.getVerificationEmailTemplate(verificationUrl);
            const text = `
Welcome to ${this.appName}!

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
            `.trim();

            // Send email
            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });

            console.log(`✅ Verification email sent to ${email}`);
            return { success: true, token };

        } catch (error) {
            console.error('❌ Failed to send verification email:', error);
            throw error;
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(userId, email) {
        try {
            // Generate reset token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

            // Store token in database
            await this.db.pool.execute(
                `INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
                 VALUES (?, ?, 'password_reset', ?)
                 ON DUPLICATE KEY UPDATE token = ?, expires_at = ?`,
                [userId, token, expiresAt, token, expiresAt]
            );

            // Generate reset URL
            const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

            // Email content
            const subject = `Reset your ${this.appName} password`;
            const html = this.getPasswordResetEmailTemplate(resetUrl);
            const text = `
You requested to reset your ${this.appName} password.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
            `.trim();

            // Send email
            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });

            console.log(`✅ Password reset email sent to ${email}`);
            return { success: true, token };

        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            throw error;
        }
    }

    /**
     * Send subscription confirmation email
     */
    async sendSubscriptionConfirmation(email, tier, amount) {
        try {
            const subject = `Welcome to ${this.appName} ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`;
            const html = this.getSubscriptionConfirmationTemplate(tier, amount);
            const text = `
Thank you for subscribing to ${this.appName} ${tier.charAt(0).toUpperCase() + tier.slice(1)}!

Your subscription is now active. You have access to all ${tier} features.

Amount: $${(amount / 100).toFixed(2)} per month

Manage your subscription: ${this.appUrl}/account/billing

Questions? Contact us at support@jobtool.app
            `.trim();

            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });

            console.log(`✅ Subscription confirmation sent to ${email}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to send subscription confirmation:', error);
            throw error;
        }
    }

    /**
     * Send subscription cancellation email
     */
    async sendSubscriptionCancellation(email, tier, endDate) {
        try {
            const subject = `Your ${this.appName} subscription has been canceled`;
            const html = this.getSubscriptionCancellationTemplate(tier, endDate);
            const text = `
Your ${this.appName} ${tier} subscription has been canceled.

You'll continue to have access until: ${new Date(endDate).toLocaleDateString()}

After that, your account will revert to the Free tier.

Want to reactivate? Visit: ${this.appUrl}/account/billing

Questions? Contact us at support@jobtool.app
            `.trim();

            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });

            console.log(`✅ Cancellation email sent to ${email}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to send cancellation email:', error);
            throw error;
        }
    }

    /**
     * Send payment failed email
     */
    async sendPaymentFailed(email, tier, amount) {
        try {
            const subject = `Payment failed for your ${this.appName} subscription`;
            const html = this.getPaymentFailedTemplate(tier, amount);
            const text = `
We couldn't process your payment for ${this.appName} ${tier}.

Amount: $${(amount / 100).toFixed(2)}

Please update your payment method to continue your subscription:
${this.appUrl}/account/billing

Your subscription will be canceled if payment isn't received within 7 days.

Questions? Contact us at support@jobtool.app
            `.trim();

            await this.sendEmail({
                to: email,
                subject,
                text,
                html
            });

            console.log(`✅ Payment failed email sent to ${email}`);
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to send payment failed email:', error);
            throw error;
        }
    }

    /**
     * Send generic email
     */
    async sendEmail({ to, subject, text, html }) {
        if (!this.transporter) {
            console.log('📧 [EMAIL MOCK]');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Body:', text);
            return { success: true, mocked: true };
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.from,
                to,
                subject,
                text,
                html
            });

            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw error;
        }
    }

    /**
     * Verify email token
     */
    async verifyEmailToken(token) {
        try {
            const [rows] = await this.db.pool.execute(
                `SELECT * FROM verification_tokens
                 WHERE token = ? AND token_type = 'email_verification' AND expires_at > NOW()`,
                [token]
            );

            if (rows.length === 0) {
                return { valid: false, error: 'Invalid or expired token' };
            }

            const tokenData = rows[0];

            // Mark email as verified
            await this.db.pool.execute(
                `UPDATE users SET email_verified = TRUE WHERE id = ?`,
                [tokenData.user_id]
            );

            // Delete used token
            await this.db.pool.execute(
                `DELETE FROM verification_tokens WHERE token = ?`,
                [token]
            );

            console.log(`✅ Email verified for user ${tokenData.user_id}`);
            return { valid: true, userId: tokenData.user_id };

        } catch (error) {
            console.error('❌ Email verification failed:', error);
            throw error;
        }
    }

    /**
     * Verify password reset token
     */
    async verifyPasswordResetToken(token) {
        try {
            const [rows] = await this.db.pool.execute(
                `SELECT * FROM verification_tokens
                 WHERE token = ? AND token_type = 'password_reset' AND expires_at > NOW()`,
                [token]
            );

            if (rows.length === 0) {
                return { valid: false, error: 'Invalid or expired token' };
            }

            return { valid: true, userId: rows[0].user_id };

        } catch (error) {
            console.error('❌ Password reset token verification failed:', error);
            throw error;
        }
    }

    /**
     * Delete password reset token after use
     */
    async deletePasswordResetToken(token) {
        try {
            await this.db.pool.execute(
                `DELETE FROM verification_tokens WHERE token = ?`,
                [token]
            );
        } catch (error) {
            console.error('❌ Failed to delete token:', error);
        }
    }

    // Email Templates

    getVerificationEmailTemplate(verificationUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3498db; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
        </div>
        <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Welcome to ${this.appName}! Please verify your email address to activate your account.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border: 1px solid #ddd;">${verificationUrl}</p>
            <p><small>This link will expire in 24 hours.</small></p>
        </div>
        <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    getPasswordResetEmailTemplate(resetUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to create a new password.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border: 1px solid #ddd;">${resetUrl}</p>
            <p><small>This link will expire in 1 hour.</small></p>
        </div>
        <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    getSubscriptionConfirmationTemplate(tier, amount) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #27ae60; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!</h1>
        </div>
        <div class="content">
            <h2>Thank you for subscribing!</h2>
            <p>Your ${this.appName} ${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription is now active.</p>
            <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)} per month</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${this.appUrl}/account/billing" class="button">Manage Subscription</a>
            </p>
        </div>
        <div class="footer">
            <p>Questions? Contact us at support@jobtool.app</p>
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    getSubscriptionCancellationTemplate(tier, endDate) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #95a5a6; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Subscription Canceled</h1>
        </div>
        <div class="content">
            <h2>We're sorry to see you go</h2>
            <p>Your ${this.appName} ${tier} subscription has been canceled.</p>
            <p><strong>Access until:</strong> ${new Date(endDate).toLocaleDateString()}</p>
            <p>After that, your account will revert to the Free tier.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${this.appUrl}/pricing" class="button">Reactivate Subscription</a>
            </p>
        </div>
        <div class="footer">
            <p>Questions? Contact us at support@jobtool.app</p>
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    getPaymentFailedTemplate(tier, amount) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; }
        .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Payment Failed</h1>
        </div>
        <div class="content">
            <h2>We couldn't process your payment</h2>
            <p>There was an issue charging your payment method for ${this.appName} ${tier}.</p>
            <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
            <p>Please update your payment method to continue your subscription.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${this.appUrl}/account/billing" class="button">Update Payment Method</a>
            </p>
            <p><small>Your subscription will be canceled if payment isn't received within 7 days.</small></p>
        </div>
        <div class="footer">
            <p>Questions? Contact us at support@jobtool.app</p>
            <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}

module.exports = EmailService;
