// oauth-service.js - OAuth2 authentication service
// Handles Google, GitHub, LinkedIn authentication flows

const passport = require('passport');
const crypto = require('crypto');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

class OAuthService {
    constructor(db) {
        this.db = db;
        this.passport = passport;
        this.initialized = false;
    }

    /**
     * Initialize OAuth strategies
     */
    initialize() {
        if (this.initialized) {
            console.log('⚠️ OAuth already initialized');
            return;
        }

        // Configure passport serialization
        this.passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        this.passport.deserializeUser(async (id, done) => {
            try {
                const user = await this.db.getUserById(id);
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });

        // Initialize strategies
        this.initializeGoogle();
        this.initializeGitHub();
        this.initializeLinkedIn();

        this.initialized = true;
        console.log('✅ OAuth service initialized');
    }

    /**
     * Google OAuth Strategy
     */
    initializeGoogle() {
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/oauth/google/callback';

        if (!googleClientId || !googleClientSecret) {
            console.log('⚠️ Google OAuth not configured (missing credentials)');
            return;
        }

        this.passport.use(new GoogleStrategy({
            clientID: googleClientId,
            clientSecret: googleClientSecret,
            callbackURL: callbackURL,
            scope: ['profile', 'email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await this.handleOAuthProfile('google', profile, accessToken);
                done(null, user);
            } catch (error) {
                console.error('❌ Google OAuth error:', error);
                done(error, null);
            }
        }));

        console.log('✅ Google OAuth strategy initialized');
    }

    /**
     * GitHub OAuth Strategy
     */
    initializeGitHub() {
        const githubClientId = process.env.GITHUB_CLIENT_ID;
        const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
        const callbackURL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/oauth/github/callback';

        if (!githubClientId || !githubClientSecret) {
            console.log('⚠️ GitHub OAuth not configured (missing credentials)');
            return;
        }

        this.passport.use(new GitHubStrategy({
            clientID: githubClientId,
            clientSecret: githubClientSecret,
            callbackURL: callbackURL,
            scope: ['user:email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await this.handleOAuthProfile('github', profile, accessToken);
                done(null, user);
            } catch (error) {
                console.error('❌ GitHub OAuth error:', error);
                done(error, null);
            }
        }));

        console.log('✅ GitHub OAuth strategy initialized');
    }

    /**
     * LinkedIn OAuth Strategy
     */
    initializeLinkedIn() {
        const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
        const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        const callbackURL = process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3000/api/oauth/linkedin/callback';

        if (!linkedinClientId || !linkedinClientSecret) {
            console.log('⚠️ LinkedIn OAuth not configured (missing credentials)');
            return;
        }

        this.passport.use(new LinkedInStrategy({
            clientID: linkedinClientId,
            clientSecret: linkedinClientSecret,
            callbackURL: callbackURL,
            scope: ['r_emailaddress', 'r_liteprofile']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await this.handleOAuthProfile('linkedin', profile, accessToken);
                done(null, user);
            } catch (error) {
                console.error('❌ LinkedIn OAuth error:', error);
                done(error, null);
            }
        }));

        console.log('✅ LinkedIn OAuth strategy initialized');
    }

    /**
     * Handle OAuth profile from any provider
     * Creates new user or links to existing account
     */
    async handleOAuthProfile(provider, profile, accessToken) {
        try {
            // Extract common fields from profile
            const email = this.extractEmail(profile);
            const name = this.extractName(profile);
            const avatarUrl = this.extractAvatar(profile);

            if (!email) {
                throw new Error('Email not provided by OAuth provider');
            }

            // Check if user exists with this email
            let user = await this.db.getUserByEmail(email);

            if (user) {
                // User exists - update OAuth info
                await this.db.pool.execute(
                    `UPDATE users SET
                        oauth_provider = ?,
                        oauth_provider_id = ?,
                        oauth_access_token = ?,
                        avatar_url = COALESCE(?, avatar_url),
                        display_name = COALESCE(?, display_name),
                        email_verified = TRUE,
                        last_login_at = NOW()
                    WHERE id = ?`,
                    [provider, profile.id, accessToken, avatarUrl, name, user.id]
                );

                // Log OAuth login
                await this.db.pool.execute(
                    `INSERT INTO activity_logs (user_id, activity_type, details)
                     VALUES (?, 'oauth_login', ?)`,
                    [user.id, JSON.stringify({ provider, timestamp: new Date() })]
                );

                // Refresh user data
                user = await this.db.getUserById(user.id);
                console.log(`✅ User ${email} logged in via ${provider}`);

            } else {
                // New user - create account
                const userId = this.generateUserId();

                await this.db.pool.execute(
                    `INSERT INTO users (
                        id, email, email_verified, display_name, avatar_url,
                        oauth_provider, oauth_provider_id, oauth_access_token,
                        subscription_tier, subscription_status, created_at, last_login_at
                    ) VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, 'free', 'active', NOW(), NOW())`,
                    [userId, email, name, avatarUrl, provider, profile.id, accessToken]
                );

                // Initialize usage tracking for new user
                await this.db.pool.execute(
                    `INSERT INTO usage_tracking (user_id, jobs_limit, resumes_limit, jobs_count, resumes_count, api_calls_count)
                     VALUES (?, 10, 1, 0, 0, 0)`,
                    [userId]
                );

                // Log registration
                await this.db.pool.execute(
                    `INSERT INTO activity_logs (user_id, activity_type, details)
                     VALUES (?, 'user_registered', ?)`,
                    [userId, JSON.stringify({ provider, method: 'oauth', timestamp: new Date() })]
                );

                user = await this.db.getUserById(userId);
                console.log(`✅ New user ${email} registered via ${provider}`);
            }

            return user;

        } catch (error) {
            console.error(`❌ Error handling ${provider} OAuth:`, error);
            throw error;
        }
    }

    /**
     * Extract email from OAuth profile
     */
    extractEmail(profile) {
        if (profile.emails && profile.emails.length > 0) {
            return profile.emails[0].value;
        }
        if (profile._json && profile._json.email) {
            return profile._json.email;
        }
        return null;
    }

    /**
     * Extract name from OAuth profile
     */
    extractName(profile) {
        if (profile.displayName) {
            return profile.displayName;
        }
        if (profile.name) {
            return `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim();
        }
        if (profile._json && profile._json.name) {
            return profile._json.name;
        }
        return 'User';
    }

    /**
     * Extract avatar URL from OAuth profile
     */
    extractAvatar(profile) {
        if (profile.photos && profile.photos.length > 0) {
            return profile.photos[0].value;
        }
        if (profile._json && profile._json.picture) {
            return profile._json.picture;
        }
        if (profile._json && profile._json.avatar_url) {
            return profile._json.avatar_url;
        }
        return null;
    }

    /**
     * Generate cryptographically secure unique user ID
     */
    generateUserId() {
        const timestamp = Date.now();
        const randomPart = crypto.randomBytes(6).toString('base64url');
        return `user_${timestamp}_${randomPart}`;
    }

    /**
     * Link OAuth account to existing user
     */
    async linkOAuthAccount(userId, provider, profile, accessToken) {
        try {
            await this.db.pool.execute(
                `UPDATE users SET
                    oauth_provider = ?,
                    oauth_provider_id = ?,
                    oauth_access_token = ?
                WHERE id = ?`,
                [provider, profile.id, accessToken, userId]
            );

            // Sanitize provider for logging to prevent format string injection
            const sanitizedProvider = String(provider || 'unknown').replace(/[^\w-]/g, '').substring(0, 20);
            console.log(`✅ Linked ${sanitizedProvider} account to user ${userId}`);
            return true;

        } catch (error) {
            const sanitizedProvider = String(provider || 'unknown').replace(/[^\w-]/g, '').substring(0, 20);
            console.error(`❌ Error linking ${sanitizedProvider} account:`, error);
            throw error;
        }
    }

    /**
     * Unlink OAuth account from user
     */
    async unlinkOAuthAccount(userId) {
        try {
            // Check if user has password (can't unlink if OAuth is only auth method)
            const user = await this.db.getUserById(userId);
            if (!user.password_hash) {
                throw new Error('Cannot unlink OAuth - please set a password first');
            }

            await this.db.pool.execute(
                `UPDATE users SET
                    oauth_provider = NULL,
                    oauth_provider_id = NULL,
                    oauth_access_token = NULL
                WHERE id = ?`,
                [userId]
            );

            console.log(`✅ Unlinked OAuth account from user ${userId}`);
            return true;

        } catch (error) {
            console.error('❌ Error unlinking OAuth account:', error);
            throw error;
        }
    }

    /**
     * Get passport middleware
     */
    getPassport() {
        return this.passport;
    }
}

module.exports = OAuthService;
