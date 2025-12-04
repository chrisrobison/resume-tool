// oauth.js - OAuth2 authentication routes
// Handles Google, GitHub, LinkedIn OAuth flows

const express = require('express');
const router = express.Router();

/**
 * Initialize OAuth routes
 * @param {OAuthService} oauthService - OAuth service instance
 * @param {Function} generateToken - JWT token generator
 */
function initializeOAuthRoutes(oauthService, generateToken) {
    const passport = oauthService.getPassport();

    // ============================================================
    // Google OAuth
    // ============================================================

    /**
     * GET /api/oauth/google
     * Initiate Google OAuth flow
     */
    router.get('/google',
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false
        })
    );

    /**
     * GET /api/oauth/google/callback
     * Google OAuth callback
     */
    router.get('/google/callback',
        passport.authenticate('google', {
            session: false,
            failureRedirect: '/login?error=oauth_failed'
        }),
        (req, res) => {
            try {
                // Generate JWT token
                const token = generateToken(req.user);

                // Redirect to app with token
                const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000';
                res.redirect(`${redirectUrl}?token=${token}&provider=google`);

            } catch (error) {
                console.error('❌ Google OAuth callback error:', error);
                res.redirect('/login?error=oauth_callback_failed');
            }
        }
    );

    // ============================================================
    // GitHub OAuth
    // ============================================================

    /**
     * GET /api/oauth/github
     * Initiate GitHub OAuth flow
     */
    router.get('/github',
        passport.authenticate('github', {
            scope: ['user:email'],
            session: false
        })
    );

    /**
     * GET /api/oauth/github/callback
     * GitHub OAuth callback
     */
    router.get('/github/callback',
        passport.authenticate('github', {
            session: false,
            failureRedirect: '/login?error=oauth_failed'
        }),
        (req, res) => {
            try {
                // Generate JWT token
                const token = generateToken(req.user);

                // Redirect to app with token
                const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000';
                res.redirect(`${redirectUrl}?token=${token}&provider=github`);

            } catch (error) {
                console.error('❌ GitHub OAuth callback error:', error);
                res.redirect('/login?error=oauth_callback_failed');
            }
        }
    );

    // ============================================================
    // LinkedIn OAuth
    // ============================================================

    /**
     * GET /api/oauth/linkedin
     * Initiate LinkedIn OAuth flow
     */
    router.get('/linkedin',
        passport.authenticate('linkedin', {
            scope: ['r_emailaddress', 'r_liteprofile'],
            session: false
        })
    );

    /**
     * GET /api/oauth/linkedin/callback
     * LinkedIn OAuth callback
     */
    router.get('/linkedin/callback',
        passport.authenticate('linkedin', {
            session: false,
            failureRedirect: '/login?error=oauth_failed'
        }),
        (req, res) => {
            try {
                // Generate JWT token
                const token = generateToken(req.user);

                // Redirect to app with token
                const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000';
                res.redirect(`${redirectUrl}?token=${token}&provider=linkedin`);

            } catch (error) {
                console.error('❌ LinkedIn OAuth callback error:', error);
                res.redirect('/login?error=oauth_callback_failed');
            }
        }
    );

    // ============================================================
    // OAuth Management Endpoints
    // ============================================================

    /**
     * POST /api/oauth/link
     * Link OAuth account to existing user (requires authentication)
     */
    router.post('/link', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const { provider, profile, accessToken } = req.body;

            if (!provider || !profile || !accessToken) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            await oauthService.linkOAuthAccount(userId, provider, profile, accessToken);

            res.json({
                success: true,
                message: `${provider} account linked successfully`
            });

        } catch (error) {
            console.error('❌ OAuth link error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/oauth/unlink
     * Unlink OAuth account from user (requires authentication)
     */
    router.post('/unlink', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            await oauthService.unlinkOAuthAccount(userId);

            res.json({
                success: true,
                message: 'OAuth account unlinked successfully'
            });

        } catch (error) {
            console.error('❌ OAuth unlink error:', error);
            res.status(500).json({
                error: error.message,
                code: error.message.includes('password') ? 'PASSWORD_REQUIRED' : 'UNLINK_FAILED'
            });
        }
    });

    /**
     * GET /api/oauth/status
     * Get OAuth connection status for current user
     */
    router.get('/status', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const user = await oauthService.db.getUserById(userId);

            res.json({
                connected: !!user.oauth_provider,
                provider: user.oauth_provider || null,
                providerId: user.oauth_provider_id || null,
                hasPassword: !!user.password_hash
            });

        } catch (error) {
            console.error('❌ OAuth status error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = initializeOAuthRoutes;
