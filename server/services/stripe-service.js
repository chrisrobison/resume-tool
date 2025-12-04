// stripe-service.js - Stripe payment and subscription management
// Handles all Stripe API interactions for payments and subscriptions

const Stripe = require('stripe');

class StripeService {
    constructor() {
        this.stripe = null;
        this.initialized = false;
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
        
        // Price IDs (set in Stripe dashboard or environment)
        this.prices = {
            pro: {
                monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
                yearly: process.env.STRIPE_PRICE_PRO_YEARLY || ''
            },
            enterprise: {
                monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
                yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || ''
            }
        };
    }

    /**
     * Initialize Stripe with API key
     */
    initialize() {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        
        if (!apiKey) {
            console.warn('⚠️  Stripe API key not configured. Set STRIPE_SECRET_KEY environment variable.');
            return false;
        }

        try {
            this.stripe = new Stripe(apiKey, {
                apiVersion: '2023-10-16'
            });
            
            this.initialized = true;
            console.log('✅ Stripe service initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Stripe:', error);
            return false;
        }
    }

    /**
     * Ensure Stripe is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Stripe service not initialized. Set STRIPE_SECRET_KEY.');
        }
    }

    // ==================== CUSTOMER MANAGEMENT ====================

    /**
     * Create a Stripe customer
     */
    async createCustomer({ email, name, metadata = {} }) {
        this.ensureInitialized();

        try {
            const customer = await this.stripe.customers.create({
                email,
                name,
                metadata
            });

            return customer;

        } catch (error) {
            console.error('Failed to create Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Get a Stripe customer
     */
    async getCustomer(customerId) {
        this.ensureInitialized();

        try {
            const customer = await this.stripe.customers.retrieve(customerId);
            return customer;

        } catch (error) {
            console.error('Failed to retrieve Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Update a Stripe customer
     */
    async updateCustomer(customerId, updates) {
        this.ensureInitialized();

        try {
            const customer = await this.stripe.customers.update(customerId, updates);
            return customer;

        } catch (error) {
            console.error('Failed to update Stripe customer:', error);
            throw error;
        }
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    /**
     * Create a subscription
     */
    async createSubscription({ customerId, priceId, trialDays = 0, metadata = {} }) {
        this.ensureInitialized();

        try {
            const subscriptionData = {
                customer: customerId,
                items: [{ price: priceId }],
                metadata,
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription'
                },
                expand: ['latest_invoice.payment_intent']
            };

            if (trialDays > 0) {
                subscriptionData.trial_period_days = trialDays;
            }

            const subscription = await this.stripe.subscriptions.create(subscriptionData);

            return subscription;

        } catch (error) {
            console.error('Failed to create subscription:', error);
            throw error;
        }
    }

    /**
     * Get a subscription
     */
    async getSubscription(subscriptionId) {
        this.ensureInitialized();

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            return subscription;

        } catch (error) {
            console.error('Failed to retrieve subscription:', error);
            throw error;
        }
    }

    /**
     * Update a subscription
     */
    async updateSubscription(subscriptionId, updates) {
        this.ensureInitialized();

        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, updates);
            return subscription;

        } catch (error) {
            console.error('Failed to update subscription:', error);
            throw error;
        }
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        this.ensureInitialized();

        try {
            if (cancelAtPeriodEnd) {
                // Cancel at end of billing period
                const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true
                });
                return subscription;
            } else {
                // Cancel immediately
                const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
                return subscription;
            }

        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }

    /**
     * Reactivate a canceled subscription
     */
    async reactivateSubscription(subscriptionId) {
        this.ensureInitialized();

        try {
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false
            });
            return subscription;

        } catch (error) {
            console.error('Failed to reactivate subscription:', error);
            throw error;
        }
    }

    // ==================== PAYMENT METHODS ====================

    /**
     * Attach payment method to customer
     */
    async attachPaymentMethod(paymentMethodId, customerId) {
        this.ensureInitialized();

        try {
            const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId
            });

            // Set as default payment method
            await this.stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            return paymentMethod;

        } catch (error) {
            console.error('Failed to attach payment method:', error);
            throw error;
        }
    }

    /**
     * List customer's payment methods
     */
    async listPaymentMethods(customerId) {
        this.ensureInitialized();

        try {
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type: 'card'
            });

            return paymentMethods.data;

        } catch (error) {
            console.error('Failed to list payment methods:', error);
            throw error;
        }
    }

    /**
     * Detach payment method
     */
    async detachPaymentMethod(paymentMethodId) {
        this.ensureInitialized();

        try {
            const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
            return paymentMethod;

        } catch (error) {
            console.error('Failed to detach payment method:', error);
            throw error;
        }
    }

    // ==================== CHECKOUT SESSION ====================

    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, metadata = {} }) {
        this.ensureInitialized();

        try {
            const sessionData = {
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata
            };

            if (customerId) {
                sessionData.customer = customerId;
            } else {
                sessionData.customer_creation = 'always';
            }

            const session = await this.stripe.checkout.sessions.create(sessionData);

            return session;

        } catch (error) {
            console.error('Failed to create checkout session:', error);
            throw error;
        }
    }

    /**
     * Create a portal session for subscription management
     */
    async createPortalSession({ customerId, returnUrl }) {
        this.ensureInitialized();

        try {
            const session = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl
            });

            return session;

        } catch (error) {
            console.error('Failed to create portal session:', error);
            throw error;
        }
    }

    // ==================== INVOICES ====================

    /**
     * Get upcoming invoice for customer
     */
    async getUpcomingInvoice(customerId) {
        this.ensureInitialized();

        try {
            const invoice = await this.stripe.invoices.retrieveUpcoming({
                customer: customerId
            });

            return invoice;

        } catch (error) {
            console.error('Failed to retrieve upcoming invoice:', error);
            throw error;
        }
    }

    /**
     * List customer invoices
     */
    async listInvoices(customerId, limit = 10) {
        this.ensureInitialized();

        try {
            const invoices = await this.stripe.invoices.list({
                customer: customerId,
                limit
            });

            return invoices.data;

        } catch (error) {
            console.error('Failed to list invoices:', error);
            throw error;
        }
    }

    // ==================== WEBHOOKS ====================

    /**
     * Construct and verify webhook event
     */
    constructWebhookEvent(payload, signature) {
        this.ensureInitialized();

        if (!this.webhookSecret) {
            throw new Error('Webhook secret not configured');
        }

        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.webhookSecret
            );

            return event;

        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            throw error;
        }
    }

    /**
     * Handle subscription updated event
     */
    async handleSubscriptionUpdated(subscription, db) {
        try {
            const customerId = subscription.customer;
            const status = subscription.status;
            const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

            // Update subscription in database
            await db.updateSubscriptionStatus(subscription.id, status, {
                currentPeriodEnd
            });

            console.log(`✅ Subscription ${subscription.id} updated to status: ${status}`);

        } catch (error) {
            console.error('Failed to handle subscription update:', error);
            throw error;
        }
    }

    /**
     * Handle subscription deleted event
     */
    async handleSubscriptionDeleted(subscription, db) {
        try {
            const endedAt = new Date();

            await db.updateSubscriptionStatus(subscription.id, 'canceled', {
                endedAt
            });

            // Downgrade user to free tier
            // This should be handled in the webhook route with user lookup

            console.log(`✅ Subscription ${subscription.id} deleted`);

        } catch (error) {
            console.error('Failed to handle subscription deletion:', error);
            throw error;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSucceeded(invoice, db) {
        try {
            const customerId = invoice.customer;
            const amountPaid = invoice.amount_paid;
            const subscriptionId = invoice.subscription;

            // Record payment transaction
            // This should be handled in the webhook route with user lookup

            console.log(`✅ Payment succeeded: ${amountPaid} cents for customer ${customerId}`);

        } catch (error) {
            console.error('Failed to handle payment success:', error);
            throw error;
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get price ID for tier and billing cycle
     */
    getPriceId(tier, billingCycle = 'monthly') {
        if (tier === 'free') {
            return null;
        }

        const priceId = this.prices[tier]?.[billingCycle];
        
        if (!priceId) {
            throw new Error(`Price ID not configured for ${tier} ${billingCycle}`);
        }

        return priceId;
    }

    /**
     * Get tier from price ID
     */
    getTierFromPriceId(priceId) {
        for (const [tier, prices] of Object.entries(this.prices)) {
            if (prices.monthly === priceId || prices.yearly === priceId) {
                return {
                    tier,
                    billingCycle: prices.monthly === priceId ? 'monthly' : 'yearly'
                };
            }
        }

        return null;
    }

    /**
     * Format amount in dollars
     */
    formatAmount(cents, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(cents / 100);
    }
}

// Export singleton instance
let instance = null;

module.exports = {
    StripeService,
    getInstance: () => {
        if (!instance) {
            instance = new StripeService();
            instance.initialize();
        }
        return instance;
    }
};
