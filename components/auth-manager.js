// Auth Manager Component - Handles login, registration, and OAuth
// Compatible with ComponentBase pattern

import { ComponentBase } from '../js/component-base.js';

class AuthManager extends ComponentBase {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Component state
        this._mode = 'login'; // 'login' | 'register' | 'forgot'
        this._loading = false;
        this._error = null;
        this._message = null;
    }

    async onInitialize() {
        console.log('AuthManager: Initializing');

        // Check if already authenticated
        const token = localStorage.getItem('authToken');
        if (token) {
            await this.verifyToken(token);
        }

        this.render();
        this.setupEventListeners();
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/api/auth/v2/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const user = await response.json();
                this.handleAuthSuccess(user, token);
            } else {
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('authToken');
        }
    }

    setupEventListeners() {
        const shadow = this.shadowRoot;

        // Mode switching
        shadow.addEventListener('click', (e) => {
            if (e.target.matches('.mode-switch')) {
                this._mode = e.target.dataset.mode;
                this._error = null;
                this._message = null;
                this.render();
            }
        });

        // Form submission
        shadow.addEventListener('submit', async (e) => {
            if (e.target.matches('.auth-form')) {
                e.preventDefault();
                await this.handleFormSubmit(e.target);
            }
        });

        // OAuth buttons
        shadow.addEventListener('click', async (e) => {
            if (e.target.matches('.oauth-btn')) {
                const provider = e.target.dataset.provider;
                await this.handleOAuth(provider);
            }
        });
    }

    async handleFormSubmit(form) {
        this._loading = true;
        this._error = null;
        this.render();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            let endpoint, method = 'POST';

            switch (this._mode) {
                case 'register':
                    endpoint = '/api/auth/v2/register';
                    break;
                case 'login':
                    endpoint = '/api/auth/v2/login';
                    break;
                case 'forgot':
                    endpoint = '/api/auth/v2/forgot-password';
                    break;
            }

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Request failed');
            }

            // Handle success
            if (this._mode === 'forgot') {
                this._message = 'Password reset email sent! Check your inbox.';
                this._mode = 'login';
            } else if (this._mode === 'register') {
                this._message = 'Registration successful! Please check your email to verify your account.';
                this._mode = 'login';
            } else {
                // Login successful
                this.handleAuthSuccess(result.user, result.token);
            }

        } catch (error) {
            console.error('Auth error:', error);
            this._error = error.message;
        } finally {
            this._loading = false;
            this.render();
        }
    }

    handleAuthSuccess(user, token) {
        // Store token
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Emit auth success event
        this.dispatchEvent(new CustomEvent('auth-success', {
            detail: { user, token },
            bubbles: true,
            composed: true
        }));

        // Reload page or redirect
        window.location.reload();
    }

    async handleOAuth(provider) {
        // Redirect to OAuth endpoint
        window.location.href = `/api/oauth/${provider}`;
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
            <style>${this.getStyles()}</style>
            <div class="auth-container">
                <div class="auth-card">
                    ${this.renderHeader()}
                    ${this.renderForm()}
                    ${this.renderOAuthButtons()}
                    ${this.renderFooter()}
                </div>
            </div>
        `;
    }

    renderHeader() {
        const titles = {
            login: 'Welcome Back',
            register: 'Create Account',
            forgot: 'Reset Password'
        };

        const subtitles = {
            login: 'Sign in to continue to NextRole',
            register: 'Join NextRole to manage your job search',
            forgot: 'Enter your email to reset your password'
        };

        return `
            <div class="auth-header">
                <h1>${titles[this._mode]}</h1>
                <p>${subtitles[this._mode]}</p>
            </div>
        `;
    }

    renderForm() {
        if (this._loading) {
            return '<div class="loading">Processing...</div>';
        }

        return `
            <form class="auth-form">
                ${this._error ? `<div class="error-message">${this._error}</div>` : ''}
                ${this._message ? `<div class="success-message">${this._message}</div>` : ''}

                ${this._mode === 'register' ? `
                    <div class="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="displayName"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                ` : ''}

                <div class="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        required
                    />
                </div>

                ${this._mode !== 'forgot' ? `
                    <div class="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minlength="8"
                        />
                    </div>
                ` : ''}

                ${this._mode === 'register' ? `
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="••••••••"
                            required
                            minlength="8"
                        />
                    </div>
                ` : ''}

                ${this._mode === 'login' ? `
                    <div class="form-options">
                        <label>
                            <input type="checkbox" name="remember" />
                            Remember me
                        </label>
                        <a href="#" class="mode-switch" data-mode="forgot">
                            Forgot password?
                        </a>
                    </div>
                ` : ''}

                <button type="submit" class="submit-btn">
                    ${this._mode === 'login' ? 'Sign In' :
                      this._mode === 'register' ? 'Create Account' :
                      'Send Reset Link'}
                </button>
            </form>
        `;
    }

    renderOAuthButtons() {
        if (this._mode === 'forgot') return '';

        return `
            <div class="oauth-divider">
                <span>or continue with</span>
            </div>
            <div class="oauth-buttons">
                <button class="oauth-btn google" data-provider="google">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64,9.2c0-0.63-0.06-1.25-0.16-1.84H9v3.48h4.84c-0.21,1.12-0.84,2.07-1.8,2.71v2.26h2.92 C16.66,14.09,17.64,11.85,17.64,9.2z"/>
                        <path fill="#34A853" d="M9,18c2.43,0,4.47-0.8,5.96-2.18l-2.92-2.26c-0.8,0.54-1.84,0.86-3.04,0.86c-2.34,0-4.32-1.58-5.03-3.71 H0.96v2.33C2.44,15.98,5.48,18,9,18z"/>
                        <path fill="#FBBC05" d="M3.97,10.71c-0.18-0.54-0.28-1.11-0.28-1.71s0.1-1.17,0.28-1.71V4.96H0.96C0.35,6.18,0,7.55,0,9 s0.35,2.82,0.96,4.04L3.97,10.71z"/>
                        <path fill="#EA4335" d="M9,3.58c1.32,0,2.5,0.45,3.44,1.35l2.58-2.58C13.46,0.89,11.43,0,9,0C5.48,0,2.44,2.02,0.96,4.96l3.01,2.33 C4.68,5.16,6.66,3.58,9,3.58z"/>
                    </svg>
                    Google
                </button>
                <button class="oauth-btn github" data-provider="github">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    GitHub
                </button>
                <button class="oauth-btn linkedin" data-provider="linkedin">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077B5">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                </button>
            </div>
        `;
    }

    renderFooter() {
        if (this._mode === 'forgot') {
            return `
                <div class="auth-footer">
                    <p>
                        Remember your password?
                        <a href="#" class="mode-switch" data-mode="login">Sign in</a>
                    </p>
                </div>
            `;
        }

        return `
            <div class="auth-footer">
                <p>
                    ${this._mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <a href="#" class="mode-switch" data-mode="${this._mode === 'login' ? 'register' : 'login'}">
                        ${this._mode === 'login' ? 'Create account' : 'Sign in'}
                    </a>
                </p>
            </div>
        `;
    }

    getStyles() {
        return `
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            .auth-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }

            .auth-card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 440px;
                width: 100%;
                padding: 40px;
            }

            .auth-header {
                text-align: center;
                margin-bottom: 30px;
            }

            .auth-header h1 {
                font-size: 28px;
                color: #333;
                margin-bottom: 8px;
            }

            .auth-header p {
                color: #666;
                font-size: 14px;
            }

            .auth-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .form-group label {
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }

            .form-group input {
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.2s;
            }

            .form-group input:focus {
                outline: none;
                border-color: #667eea;
            }

            .form-options {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
            }

            .form-options label {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
            }

            .form-options a {
                color: #667eea;
                text-decoration: none;
            }

            .form-options a:hover {
                text-decoration: underline;
            }

            .submit-btn {
                padding: 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }

            .submit-btn:active {
                transform: translateY(0);
            }

            .error-message {
                padding: 12px;
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 6px;
                color: #c33;
                font-size: 14px;
            }

            .success-message {
                padding: 12px;
                background: #efe;
                border: 1px solid #cfc;
                border-radius: 6px;
                color: #3c3;
                font-size: 14px;
            }

            .loading {
                text-align: center;
                padding: 20px;
                color: #666;
            }

            .oauth-divider {
                text-align: center;
                position: relative;
                margin: 30px 0 20px;
            }

            .oauth-divider::before,
            .oauth-divider::after {
                content: '';
                position: absolute;
                top: 50%;
                width: 45%;
                height: 1px;
                background: #e0e0e0;
            }

            .oauth-divider::before {
                left: 0;
            }

            .oauth-divider::after {
                right: 0;
            }

            .oauth-divider span {
                background: white;
                padding: 0 15px;
                color: #999;
                font-size: 14px;
            }

            .oauth-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .oauth-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .oauth-btn:hover {
                border-color: #ccc;
                background: #f9f9f9;
            }

            .oauth-btn.google {
                color: #333;
            }

            .oauth-btn.github {
                color: #333;
            }

            .oauth-btn.linkedin {
                color: #0077B5;
            }

            .auth-footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 14px;
                color: #666;
            }

            .auth-footer a {
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
            }

            .auth-footer a:hover {
                text-decoration: underline;
            }

            @media (max-width: 480px) {
                .auth-card {
                    padding: 30px 20px;
                }

                .auth-header h1 {
                    font-size: 24px;
                }
            }
        `;
    }
}

customElements.define('auth-manager', AuthManager);

export default AuthManager;
