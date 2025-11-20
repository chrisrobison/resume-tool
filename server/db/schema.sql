-- Job Tool Database Schema
-- SQLite database for server-side sync and backup
-- Version: 1.0.0

-- Users table (supports both authenticated and anonymous users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID or anonymous ID
    email TEXT UNIQUE,                      -- NULL for anonymous users
    password_hash TEXT,                     -- NULL for anonymous users
    display_name TEXT,
    is_anonymous INTEGER DEFAULT 1,         -- 1 = anonymous, 0 = authenticated
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    CONSTRAINT email_required_if_not_anonymous CHECK (
        is_anonymous = 1 OR (is_anonymous = 0 AND email IS NOT NULL)
    )
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_anonymous ON users(is_anonymous);

-- Sync sessions table (track device sync status)
CREATE TABLE IF NOT EXISTS sync_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,                -- Browser/device identifier
    device_name TEXT,                       -- User-friendly device name
    last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_user ON sync_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_device ON sync_sessions(device_id);

-- Jobs table (job applications)
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,                    -- job_timestamp_random
    user_id TEXT NOT NULL,
    data JSON NOT NULL,                     -- Full job object as JSON
    version INTEGER DEFAULT 1,              -- For optimistic locking
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted INTEGER DEFAULT 0,              -- Soft delete (1 = deleted)
    deleted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_modified ON jobs(last_modified);
CREATE INDEX IF NOT EXISTS idx_jobs_deleted ON jobs(deleted);
CREATE INDEX IF NOT EXISTS idx_jobs_user_not_deleted ON jobs(user_id, deleted);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,                    -- resume_timestamp_random
    user_id TEXT NOT NULL,
    name TEXT,                              -- Resume name (extracted from data)
    data JSON NOT NULL,                     -- Full resume object as JSON
    version INTEGER DEFAULT 1,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted INTEGER DEFAULT 0,
    deleted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_modified ON resumes(last_modified);
CREATE INDEX IF NOT EXISTS idx_resumes_deleted ON resumes(deleted);
CREATE INDEX IF NOT EXISTS idx_resumes_name ON resumes(name);

-- Cover letters table
CREATE TABLE IF NOT EXISTS cover_letters (
    id TEXT PRIMARY KEY,                    -- cover_timestamp_random
    user_id TEXT NOT NULL,
    job_id TEXT,                            -- Associated job (can be NULL)
    resume_id TEXT,                         -- Associated resume (can be NULL)
    name TEXT,
    type TEXT,                              -- cover_letter, thank_you, follow_up, networking
    data JSON NOT NULL,                     -- Full cover letter object as JSON
    version INTEGER DEFAULT 1,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted INTEGER DEFAULT 0,
    deleted_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_job ON cover_letters(job_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_resume ON cover_letters(resume_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_modified ON cover_letters(last_modified);
CREATE INDEX IF NOT EXISTS idx_cover_letters_deleted ON cover_letters(deleted);

-- AI history table
CREATE TABLE IF NOT EXISTS ai_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    data JSON NOT NULL,                     -- Full AI history record
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    operation TEXT,                         -- tailor_resume, generate_cover_letter, etc.
    provider TEXT,                          -- claude, openai
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_history_user ON ai_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_history_timestamp ON ai_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_history_operation ON ai_history(operation);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    data JSON NOT NULL,                     -- Full log entry
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT,                              -- api_call, job_action, resume_action, system
    action TEXT,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);

-- Settings table (one record per user)
CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    data JSON NOT NULL,                     -- Full settings object
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_settings_modified ON settings(last_modified);

-- Sync metadata table (track what's been synced)
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,              -- jobs, resumes, cover_letters, etc.
    entity_id TEXT NOT NULL,                -- ID of the entity
    last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    device_id TEXT,                         -- Which device last synced this
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_metadata_user ON sync_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_entity ON sync_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_device ON sync_metadata(device_id);

-- Conflict log table (track conflicts for debugging)
CREATE TABLE IF NOT EXISTS conflict_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    conflict_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_version INTEGER,
    server_version INTEGER,
    client_modified DATETIME,
    server_modified DATETIME,
    resolution TEXT,                        -- server_wins, client_wins, merged, unresolved
    resolved_at DATETIME,
    resolved_by TEXT,                       -- device_id or 'auto'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conflict_log_user ON conflict_log(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_log_entity ON conflict_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_conflict_log_timestamp ON conflict_log(conflict_timestamp);

-- Database metadata table (for migrations and versioning)
CREATE TABLE IF NOT EXISTS db_metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial metadata
INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('schema_version', '1.0.0');
INSERT OR IGNORE INTO db_metadata (key, value) VALUES ('created_at', datetime('now'));

-- Triggers to automatically update last_modified timestamps

-- Jobs trigger
CREATE TRIGGER IF NOT EXISTS jobs_update_timestamp
AFTER UPDATE ON jobs
FOR EACH ROW
WHEN NEW.last_modified = OLD.last_modified
BEGIN
    UPDATE jobs SET last_modified = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Resumes trigger
CREATE TRIGGER IF NOT EXISTS resumes_update_timestamp
AFTER UPDATE ON resumes
FOR EACH ROW
WHEN NEW.last_modified = OLD.last_modified
BEGIN
    UPDATE resumes SET last_modified = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Cover letters trigger
CREATE TRIGGER IF NOT EXISTS cover_letters_update_timestamp
AFTER UPDATE ON cover_letters
FOR EACH ROW
WHEN NEW.last_modified = OLD.last_modified
BEGIN
    UPDATE cover_letters SET last_modified = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Settings trigger
CREATE TRIGGER IF NOT EXISTS settings_update_timestamp
AFTER UPDATE ON settings
FOR EACH ROW
WHEN NEW.last_modified = OLD.last_modified
BEGIN
    UPDATE settings SET last_modified = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

-- Sync metadata trigger
CREATE TRIGGER IF NOT EXISTS sync_metadata_update_timestamp
AFTER UPDATE ON sync_metadata
FOR EACH ROW
WHEN NEW.last_sync = OLD.last_sync
BEGIN
    UPDATE sync_metadata SET last_sync = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
