// Cypress E2E Tests for Monetization Features
// Tests authentication, subscriptions, and account management

describe('Monetization System E2E Tests', () => {
    const baseUrl = 'http://localhost:3000';
    const testUser = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        displayName: 'Test User'
    };

    before(() => {
        // Ensure server is running with monetization enabled
        cy.request(`${baseUrl}/health`).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.services.monetization).to.be.true;
        });
    });

    describe('Health & Status Checks', () => {
        it('should return healthy status from /health endpoint', () => {
            cy.request(`${baseUrl}/health`).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('status', 'healthy');
                expect(response.body).to.have.property('services');
                expect(response.body.services).to.have.property('mysql');
                expect(response.body.services).to.have.property('stripe');
            });
        });

        it('should return API status from /api/status endpoint', () => {
            cy.request(`${baseUrl}/api/status`).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('monetization', true);
                expect(response.body).to.have.property('features');
            });
        });
    });

    describe('User Registration', () => {
        it('should register a new user successfully', () => {
            cy.request('POST', `${baseUrl}/api/auth/v2/register`, testUser)
                .then((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body).to.have.property('message');
                    expect(response.body.message).to.include('registered');
                });
        });

        it('should reject duplicate email registration', () => {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/auth/v2/register`,
                body: testUser,
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400);
                expect(response.body).to.have.property('error');
            });
        });

        it('should reject weak passwords', () => {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/auth/v2/register`,
                body: {
                    email: `weak${Date.now()}@example.com`,
                    password: '123',
                    displayName: 'Weak Password User'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400);
            });
        });

        it('should reject invalid email formats', () => {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/auth/v2/register`,
                body: {
                    email: 'not-an-email',
                    password: 'TestPassword123!',
                    displayName: 'Invalid Email User'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400);
            });
        });
    });

    describe('User Login', () => {
        let authToken;

        it('should login with valid credentials', () => {
            cy.request('POST', `${baseUrl}/api/auth/v2/login`, {
                email: testUser.email,
                password: testUser.password
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('token');
                expect(response.body).to.have.property('user');
                expect(response.body.user.email).to.eq(testUser.email);

                authToken = response.body.token;
                cy.wrap(authToken).as('authToken');
            });
        });

        it('should reject invalid credentials', () => {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/auth/v2/login`,
                body: {
                    email: testUser.email,
                    password: 'WrongPassword'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(401);
                expect(response.body).to.have.property('error');
            });
        });

        it('should verify JWT token', function() {
            cy.request({
                url: `${baseUrl}/api/subscriptions/me`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('tier');
                expect(response.body).to.have.property('user');
            });
        });
    });

    describe('Subscription Management', () => {
        beforeEach(function() {
            // Login before each test
            cy.request('POST', `${baseUrl}/api/auth/v2/login`, {
                email: testUser.email,
                password: testUser.password
            }).then((response) => {
                cy.wrap(response.body.token).as('authToken');
            });
        });

        it('should get subscription tiers', function() {
            cy.request({
                url: `${baseUrl}/api/subscriptions/tiers`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');
                expect(response.body).to.have.length.at.least(3);

                // Check tier structure
                const tier = response.body[0];
                expect(tier).to.have.property('id');
                expect(tier).to.have.property('name');
                expect(tier).to.have.property('price');
                expect(tier).to.have.property('features');
            });
        });

        it('should get current subscription', function() {
            cy.request({
                url: `${baseUrl}/api/subscriptions/me`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('tier');
                expect(response.body).to.have.property('user');
                expect(response.body.tier).to.eq('free'); // New users start on free
            });
        });

        it('should get usage statistics', function() {
            cy.request({
                url: `${baseUrl}/api/subscriptions/usage`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('jobsUsed');
                expect(response.body).to.have.property('resumesUsed');
                expect(response.body).to.have.property('aiRequestsUsed');
                expect(response.body).to.have.property('storageUsed');
                expect(response.body).to.have.property('limits');
            });
        });

        it('should check resource limits', function() {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/subscriptions/check-limit`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: {
                    resource: 'jobs',
                    count: 1
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('allowed');
                expect(response.body.allowed).to.be.a('boolean');
            });
        });

        it('should get billing history', function() {
            cy.request({
                url: `${baseUrl}/api/subscriptions/billing-history`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.be.an('array');
            });
        });
    });

    describe('Payment Processing', () => {
        beforeEach(function() {
            // Login before each test
            cy.request('POST', `${baseUrl}/api/auth/v2/login`, {
                email: testUser.email,
                password: testUser.password
            }).then((response) => {
                cy.wrap(response.body.token).as('authToken');
            });
        });

        it('should create checkout session for Pro tier', function() {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/payments/create-checkout-session`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: {
                    tier: 'pro'
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('url');
                expect(response.body.url).to.include('stripe.com');
            });
        });

        it('should create customer portal session', function() {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/payments/create-portal-session`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('url');
                expect(response.body.url).to.include('stripe.com');
            });
        });
    });

    describe('Authentication Security', () => {
        it('should reject requests without token', () => {
            cy.request({
                url: `${baseUrl}/api/subscriptions/me`,
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(401);
            });
        });

        it('should reject invalid token', () => {
            cy.request({
                url: `${baseUrl}/api/subscriptions/me`,
                headers: {
                    'Authorization': 'Bearer invalid_token_here'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(403);
            });
        });

        it('should rate limit authentication attempts', () => {
            const requests = [];

            // Make 10 rapid login attempts
            for (let i = 0; i < 10; i++) {
                requests.push(
                    cy.request({
                        method: 'POST',
                        url: `${baseUrl}/api/auth/v2/login`,
                        body: {
                            email: 'test@example.com',
                            password: 'wrong'
                        },
                        failOnStatusCode: false
                    })
                );
            }

            // Should eventually get rate limited (429)
            Promise.all(requests).then((responses) => {
                const rateLimited = responses.some(r => r.status === 429);
                expect(rateLimited).to.be.true;
            });
        });
    });

    describe('Frontend Integration', () => {
        it('should load test-monetization.html page', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.contains('NextRole Monetization Test Suite');
        });

        it('should display server status', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.get('#server-status').should('contain', 'Server:');
            cy.get('#db-status').should('contain', 'MySQL:');
            cy.get('#stripe-status').should('contain', 'Stripe:');
        });

        it('should show login button when not authenticated', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.contains('button', 'Login').should('be.visible');
        });

        it('should run quick tests successfully', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.contains('button', 'Quick Test').click();
            cy.get('.test-item.pass', { timeout: 10000 }).should('have.length.at.least', 2);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing required fields', () => {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/auth/v2/register`,
                body: {
                    email: 'test@example.com'
                    // Missing password and displayName
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400);
                expect(response.body).to.have.property('error');
            });
        });

        it('should handle malformed JSON', () => {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/auth/v2/login`,
                body: 'not valid json',
                headers: {
                    'Content-Type': 'application/json'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.be.oneOf([400, 500]);
            });
        });

        it('should handle non-existent endpoints', () => {
            cy.request({
                url: `${baseUrl}/api/nonexistent/endpoint`,
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(404);
            });
        });
    });

    describe('Data Validation', () => {
        beforeEach(function() {
            cy.request('POST', `${baseUrl}/api/auth/v2/login`, {
                email: testUser.email,
                password: testUser.password
            }).then((response) => {
                cy.wrap(response.body.token).as('authToken');
            });
        });

        it('should validate resource types for limit checks', function() {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/subscriptions/check-limit`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: {
                    resource: 'invalid_resource',
                    count: 1
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400);
            });
        });

        it('should validate tier parameter for checkout', function() {
            cy.request({
                method: 'POST',
                url: `${baseUrl}/api/payments/create-checkout-session`,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: {
                    tier: 'invalid_tier'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400);
            });
        });
    });
});

// Additional test suite for UI components
describe('UI Component Tests', () => {
    const baseUrl = 'http://localhost:3000';

    describe('Auth Manager Component', () => {
        it('should render login form by default', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.contains('button', 'Login').click();
            cy.get('auth-manager').shadow().within(() => {
                cy.contains('Welcome Back');
                cy.get('input[type="email"]').should('exist');
                cy.get('input[type="password"]').should('exist');
            });
        });

        it('should switch to register mode', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.contains('button', 'Register').click();
            cy.get('auth-manager').shadow().within(() => {
                cy.contains('Create Account');
                cy.get('input[name="displayName"]').should('exist');
            });
        });
    });

    describe('Account Dashboard Component', () => {
        beforeEach(() => {
            // Mock authentication
            const token = 'mock_token_for_ui_testing';
            cy.window().then((win) => {
                win.localStorage.setItem('authToken', token);
            });
        });

        it('should render account dashboard when authenticated', () => {
            cy.visit(`${baseUrl}/test-monetization.html`);
            cy.get('account-dashboard').shadow().within(() => {
                cy.contains('Overview').should('exist');
                cy.contains('Subscription').should('exist');
                cy.contains('Billing History').should('exist');
                cy.contains('Usage Stats').should('exist');
            });
        });
    });
});
