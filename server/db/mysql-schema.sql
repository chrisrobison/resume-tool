-- Job Tool Database Schema - MySQL Version
-- Production database for server-side sync, backup, and monetization
-- Version: 2.0.0 (Monetization Release)

-- Use utf8mb4 for full Unicode support (including emojis)
-- Use InnoDB engine for ACID compliance and foreign keys

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ==================== CORE TABLES (Migrated from SQLite) ====================

-- Users table (supports authenticated and anonymous users, plus subscription tiers)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,                    -- UUID
    email VARCHAR(255) UNIQUE,                     -- NULL for anonymous users
    email_verified BOOLEAN DEFAULT FALSE,          -- Email verification status
    password_hash VARCHAR(255),                    -- NULL for anonymous/OAuth users
    display_name VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT TRUE,             -- TRUE = anonymous, FALSE = authenticated
    
    -- Subscription fields
    subscription_tier ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    subscription_status ENUM('active', 'canceled', 'past_due', 'trialing') DEFAULT 'active',
    subscription_started_at DATETIME,
    subscription_ends_at DATETIME,                 -- NULL for active subscriptions
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_is_anonymous (is_anonymous),
    INDEX idx_subscription_tier (subscription_tier),
    INDEX idx_stripe_customer (stripe_customer_id),
    INDEX idx_stripe_subscription (stripe_subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OAuth providers table (Google, GitHub, LinkedIn)
CREATE TABLE IF NOT EXISTS oauth_providers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    provider ENUM('google', 'github', 'linkedin') NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,        -- ID from OAuth provider
    access_token TEXT,                              -- Encrypted access token
    refresh_token TEXT,                             -- Encrypted refresh token
    token_expires_at DATETIME,
    profile_data JSON,                              -- Store profile info
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_provider_user (provider, provider_user_id),
    INDEX idx_user (user_id),
    INDEX idx_provider (provider),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    
    INDEX idx_user (user_id),
    INDEX idx_token (token),
    INDEX idx_expires (expires_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    
    INDEX idx_user (user_id),
    INDEX idx_token (token),
    INDEX idx_expires (expires_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync sessions table (track device sync status)
CREATE TABLE IF NOT EXISTS sync_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(255) NOT NULL,               -- Browser/device identifier
    device_name VARCHAR(255),                       -- User-friendly device name
    last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_device (user_id, device_id),
    INDEX idx_user (user_id),
    INDEX idx_device (device_id),
    INDEX idx_last_sync (last_sync),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jobs table (job applications)
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(255) PRIMARY KEY,                   -- job_timestamp_random
    user_id VARCHAR(36) NOT NULL,
    data JSON NOT NULL,                             -- Full job object as JSON
    version INT DEFAULT 1,                          -- For optimistic locking
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,                  -- Soft delete
    deleted_at DATETIME,
    
    INDEX idx_user (user_id),
    INDEX idx_user_not_deleted (user_id, deleted),
    INDEX idx_last_modified (last_modified),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id VARCHAR(255) PRIMARY KEY,                   -- resume_timestamp_random
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255),                              -- Resume name
    data JSON NOT NULL,                             -- Full resume object as JSON
    version INT DEFAULT 1,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    
    INDEX idx_user (user_id),
    INDEX idx_user_not_deleted (user_id, deleted),
    INDEX idx_name (name),
    INDEX idx_last_modified (last_modified),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cover letters table
CREATE TABLE IF NOT EXISTS cover_letters (
    id VARCHAR(255) PRIMARY KEY,                   -- cover_timestamp_random
    user_id VARCHAR(36) NOT NULL,
    job_id VARCHAR(255),                            -- Associated job
    resume_id VARCHAR(255),                         -- Associated resume
    name VARCHAR(255),
    type VARCHAR(50),                               -- cover_letter, thank_you, follow_up, networking
    data JSON NOT NULL,                             -- Full cover letter object
    version INT DEFAULT 1,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATETIME,
    
    INDEX idx_user (user_id),
    INDEX idx_user_not_deleted (user_id, deleted),
    INDEX idx_job (job_id),
    INDEX idx_resume (resume_id),
    INDEX idx_last_modified (last_modified),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI history table
CREATE TABLE IF NOT EXISTS ai_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    data JSON NOT NULL,                             -- Full AI history record
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    operation VARCHAR(100),                         -- tailor_resume, generate_cover_letter, etc.
    provider VARCHAR(50),                           -- claude, openai
    deleted BOOLEAN DEFAULT FALSE,
    
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_operation (operation),
    INDEX idx_provider (provider),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    data JSON NOT NULL,                             -- Full log entry
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50),                               -- api_call, job_action, resume_action, system
    action VARCHAR(100),
    deleted BOOLEAN DEFAULT FALSE,
    
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_type (type),
    INDEX idx_action (action),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table (one record per user)
CREATE TABLE IF NOT EXISTS settings (
    user_id VARCHAR(36) PRIMARY KEY,
    data JSON NOT NULL,                             -- Full settings object
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_last_modified (last_modified),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync metadata table (track what's been synced)
CREATE TABLE IF NOT EXISTS sync_metadata (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,              -- jobs, resumes, cover_letters, etc.
    entity_id VARCHAR(255) NOT NULL,                -- ID of the entity
    last_sync DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    device_id VARCHAR(255),                         -- Which device last synced this
    
    UNIQUE KEY unique_user_entity (user_id, entity_type, entity_id),
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_device (device_id),
    INDEX idx_last_sync (last_sync),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conflict log table (track conflicts for debugging)
CREATE TABLE IF NOT EXISTS conflict_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    conflict_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_version INT,
    server_version INT,
    client_modified DATETIME,
    server_modified DATETIME,
    resolution ENUM('server_wins', 'client_wins', 'merged', 'unresolved') DEFAULT 'unresolved',
    resolved_at DATETIME,
    resolved_by VARCHAR(255),                       -- device_id or 'auto'
    
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (conflict_timestamp),
    INDEX idx_resolution (resolution),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== MONETIZATION TABLES ====================

-- Subscriptions table (detailed subscription history)
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    tier ENUM('free', 'pro', 'enterprise') NOT NULL,
    status ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid') NOT NULL,
    
    -- Stripe integration
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),
    
    -- Billing details
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
    amount_cents INT,                               -- Price in cents (USD)
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Subscription lifecycle
    started_at DATETIME NOT NULL,
    current_period_start DATETIME,
    current_period_end DATETIME,
    canceled_at DATETIME,
    ended_at DATETIME,
    trial_start DATETIME,
    trial_end DATETIME,
    
    -- Metadata
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancel_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_tier (tier),
    INDEX idx_status (status),
    INDEX idx_stripe_subscription (stripe_subscription_id),
    INDEX idx_stripe_customer (stripe_customer_id),
    INDEX idx_current_period_end (current_period_end),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment transactions table (complete payment history)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    subscription_id BIGINT,
    
    -- Stripe details
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    
    -- Transaction details
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded') NOT NULL,
    payment_method VARCHAR(50),                     -- card, bank_transfer, etc.
    
    -- Refund info
    refunded_amount_cents INT DEFAULT 0,
    refund_reason TEXT,
    refunded_at DATETIME,
    
    -- Metadata
    description TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_subscription (subscription_id),
    INDEX idx_stripe_payment_intent (stripe_payment_intent_id),
    INDEX idx_stripe_invoice (stripe_invoice_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usage tracking table (for tier enforcement and analytics)
CREATE TABLE IF NOT EXISTS usage_tracking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    
    -- Current usage counts
    jobs_count INT DEFAULT 0,
    resumes_count INT DEFAULT 0,
    cover_letters_count INT DEFAULT 0,
    ai_requests_count INT DEFAULT 0,
    api_calls_count INT DEFAULT 0,
    
    -- Monthly usage (resets each billing period)
    monthly_ai_requests INT DEFAULT 0,
    monthly_api_calls INT DEFAULT 0,
    monthly_sync_operations INT DEFAULT 0,
    monthly_storage_bytes BIGINT DEFAULT 0,
    
    -- Limits based on tier
    jobs_limit INT DEFAULT 10,                      -- Free: 10, Pro/Enterprise: unlimited (-1)
    resumes_limit INT DEFAULT 1,                    -- Free: 1, Pro/Enterprise: unlimited
    
    -- Last reset timestamp
    last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user (user_id),
    INDEX idx_last_reset (last_reset_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API keys table (Enterprise tier feature)
CREATE TABLE IF NOT EXISTS api_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    key_hash VARCHAR(64) UNIQUE NOT NULL,           -- SHA-256 hash of the key
    key_prefix VARCHAR(16) NOT NULL,                -- First 8 chars for identification
    name VARCHAR(255),                              -- User-defined key name
    
    -- Permissions
    scopes JSON,                                    -- ['read:jobs', 'write:jobs', 'read:resumes', etc.]
    
    -- Rate limiting
    rate_limit_per_hour INT DEFAULT 1000,
    rate_limit_per_day INT DEFAULT 10000,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at DATETIME,
    expires_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_key_hash (key_hash),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook events table (Stripe webhooks)
CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,          -- Stripe event ID
    event_type VARCHAR(100) NOT NULL,               -- customer.subscription.updated, etc.
    payload JSON NOT NULL,                          -- Full webhook payload
    processed BOOLEAN DEFAULT FALSE,
    processed_at DATETIME,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event_type (event_type),
    INDEX idx_processed (processed),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin audit log (track admin actions)
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id VARCHAR(36) NOT NULL,             -- Admin who performed action
    target_user_id VARCHAR(36),                     -- User affected by action
    action VARCHAR(100) NOT NULL,                   -- grant_subscription, refund_payment, etc.
    details JSON,                                   -- Additional context
    ip_address VARCHAR(45),                         -- IPv4 or IPv6
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_admin (admin_user_id),
    INDEX idx_target (target_user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DATABASE METADATA ====================

-- Database metadata table (for migrations and versioning)
CREATE TABLE IF NOT EXISTS db_metadata (
    meta_key VARCHAR(100) PRIMARY KEY,
    meta_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial metadata
INSERT INTO db_metadata (meta_key, meta_value) VALUES ('schema_version', '2.0.0')
ON DUPLICATE KEY UPDATE meta_value = '2.0.0';

INSERT INTO db_metadata (meta_key, meta_value) VALUES ('created_at', NOW())
ON DUPLICATE KEY UPDATE meta_key = meta_key;

INSERT INTO db_metadata (meta_key, meta_value) VALUES ('migration_status', 'pending')
ON DUPLICATE KEY UPDATE meta_key = meta_key;

-- ==================== VIEWS FOR ANALYTICS ====================

-- Active subscriptions view (for quick stats)
CREATE OR REPLACE VIEW active_subscriptions_summary AS
SELECT 
    tier,
    COUNT(*) as count,
    SUM(amount_cents) as monthly_revenue_cents
FROM subscriptions
WHERE status = 'active'
  AND ended_at IS NULL
GROUP BY tier;

-- Monthly revenue view
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') as month,
    COUNT(*) as transaction_count,
    SUM(amount_cents) as total_revenue_cents,
    SUM(refunded_amount_cents) as total_refunds_cents,
    SUM(amount_cents - refunded_amount_cents) as net_revenue_cents
FROM payment_transactions
WHERE status IN ('succeeded', 'refunded', 'partially_refunded')
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC;

-- User tier distribution view
CREATE OR REPLACE VIEW user_tier_distribution AS
SELECT 
    subscription_tier,
    subscription_status,
    COUNT(*) as user_count
FROM users
WHERE is_anonymous = FALSE
GROUP BY subscription_tier, subscription_status;

-- ==================== STORED PROCEDURES ====================

DELIMITER //

-- Procedure to upgrade user to Pro tier
CREATE PROCEDURE upgrade_to_pro(
    IN p_user_id VARCHAR(36),
    IN p_stripe_subscription_id VARCHAR(255),
    IN p_stripe_customer_id VARCHAR(255),
    IN p_amount_cents INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Update user tier
    UPDATE users 
    SET subscription_tier = 'pro',
        subscription_status = 'active',
        subscription_started_at = NOW(),
        stripe_customer_id = p_stripe_customer_id,
        stripe_subscription_id = p_stripe_subscription_id
    WHERE id = p_user_id;
    
    -- Update usage limits
    UPDATE usage_tracking
    SET jobs_limit = -1,        -- Unlimited
        resumes_limit = -1      -- Unlimited
    WHERE user_id = p_user_id;
    
    -- Create usage_tracking if doesn't exist
    INSERT IGNORE INTO usage_tracking (user_id, jobs_limit, resumes_limit)
    VALUES (p_user_id, -1, -1);
    
    COMMIT;
END //

-- Procedure to cancel subscription
CREATE PROCEDURE cancel_subscription(
    IN p_user_id VARCHAR(36),
    IN p_reason TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Update user
    UPDATE users 
    SET subscription_status = 'canceled',
        subscription_ends_at = NOW()
    WHERE id = p_user_id;
    
    -- Update active subscription
    UPDATE subscriptions
    SET status = 'canceled',
        canceled_at = NOW(),
        cancel_reason = p_reason
    WHERE user_id = p_user_id
      AND status = 'active';
    
    COMMIT;
END //

-- Procedure to reset monthly usage
CREATE PROCEDURE reset_monthly_usage(
    IN p_user_id VARCHAR(36)
)
BEGIN
    UPDATE usage_tracking
    SET monthly_ai_requests = 0,
        monthly_api_calls = 0,
        monthly_sync_operations = 0,
        monthly_storage_bytes = 0,
        last_reset_at = NOW()
    WHERE user_id = p_user_id;
END //

DELIMITER ;

-- ==================== INITIAL DATA ====================

-- Create system admin user (update password hash after creation!)
INSERT INTO users (id, email, email_verified, display_name, is_anonymous, subscription_tier, subscription_status)
VALUES (
    UUID(),
    'admin@jobtool.app',
    TRUE,
    'System Administrator',
    FALSE,
    'enterprise',
    'active'
) ON DUPLICATE KEY UPDATE email = email;
