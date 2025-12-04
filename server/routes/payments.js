// payments.js - Stripe payment and webhook routes
// Handles payment processing, subscription creation, and Stripe webhooks

const express = require('express');
const router = express.Router();
const { getInstance: getStripeService } = require('../services/stripe-service');

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe checkout session for subscription
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { tier, billingCycle = 'monthly' } = req.body;

        if (!tier || !['pro', 'enterprise'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier. Must be pro or enterprise' });
        }

        if (!['monthly', 'yearly'].includes(billingCycle)) {
            return res.status(400).json({ error: 'Invalid billing cycle' });
        }

        const db = req.db;
        const stripeService = getStripeService();

        // Get or create Stripe customer
        const user = await db.getUserById(userId);
        let customerId = user.stripe_customer_id;

        if (!customerId) {
            const customer = await stripeService.createCustomer({
                email: user.email,
                name: user.display_name,
                metadata: { userId }
            });
            customerId = customer.id;

            // Update user with Stripe customer ID
            await db.pool.execute(
                'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
                [customerId, userId]
            );
        }

        // Get price ID for tier and billing cycle
        const priceId = stripeService.getPriceId(tier, billingCycle);

        // Create checkout session
        const session = await stripeService.createCheckoutSession({
            customerId,
            priceId,
            successUrl: `${process.env.APP_URL || 'http://localhost:3000'}/account?payment=success`,
            cancelUrl: `${process.env.APP_URL || 'http://localhost:3000'}/pricing?payment=canceled`,
            metadata: {
                userId,
                tier,
                billingCycle
            }
        });

        res.json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * POST /api/payments/create-portal-session
 * Create a Stripe customer portal session
 */
router.post('/create-portal-session', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const db = req.db;
        const user = await db.getUserById(userId);

        if (!user.stripe_customer_id) {
            return res.status(400).json({ error: 'No Stripe customer found' });
        }

        const stripeService = getStripeService();
        const session = await stripeService.createPortalSession({
            customerId: user.stripe_customer_id,
            returnUrl: `${process.env.APP_URL || 'http://localhost:3000'}/account`
        });

        res.json({
            url: session.url
        });

    } catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

/**
 * POST /api/payments/webhooks
 * Handle Stripe webhook events
 */
router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
        return res.status(400).json({ error: 'No signature provided' });
    }

    try {
        const stripeService = getStripeService();
        const db = req.db;

        // Verify webhook signature
        const event = stripeService.constructWebhookEvent(req.body, signature);

        console.log(`📥 Webhook received: ${event.type}`);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutCompleted(session, db, stripeService);
                break;
            }

            case 'customer.subscription.created': {
                const subscription = event.data.object;
                await handleSubscriptionCreated(subscription, db);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await handleSubscriptionUpdated(subscription, db);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionDeleted(subscription, db);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                await handlePaymentSucceeded(invoice, db);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                await handlePaymentFailed(invoice, db);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Log webhook event
        await db.pool.execute(
            `INSERT INTO webhook_events (event_id, event_type, payload, processed)
             VALUES (?, ?, ?, ?)`,
            [event.id, event.type, JSON.stringify(event), true]
        );

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        
        // Log failed webhook
        try {
            await req.db.pool.execute(
                `INSERT INTO webhook_events (event_id, event_type, payload, processed, error)
                 VALUES (?, ?, ?, ?, ?)`,
                ['unknown', 'error', JSON.stringify({ error: error.message }), false, error.message]
            );
        } catch (dbError) {
            console.error('Failed to log webhook error:', dbError);
        }

        res.status(400).json({ error: error.message });
    }
});

// ==================== WEBHOOK HANDLERS ====================

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session, db, stripeService) {
    try {
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Get user by Stripe customer ID
        const [users] = await db.pool.execute(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [customerId]
        );

        if (users.length === 0) {
            console.error('User not found for customer:', customerId);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Get subscription details from Stripe
        const subscription = await stripeService.getSubscription(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        
        // Determine tier from price ID
        const tierInfo = stripeService.getTierFromPriceId(priceId);
        
        if (!tierInfo) {
            console.error('Could not determine tier from price ID:', priceId);
            return;
        }

        const { tier, billingCycle } = tierInfo;

        // Update user tier
        await db.updateSubscriptionTier(userId, tier, subscription.status);

        // Create subscription record
        await db.createSubscription(userId, {
            tier,
            status: subscription.status,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            billingCycle,
            amountCents: subscription.items.data[0].price.unit_amount,
            currency: subscription.items.data[0].price.currency,
            startedAt: new Date(subscription.created * 1000),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });

        // Update usage limits for new tier
        await db.pool.execute(
            `INSERT INTO usage_tracking (user_id, jobs_limit, resumes_limit)
             VALUES (?, -1, -1)
             ON DUPLICATE KEY UPDATE
                 jobs_limit = -1,
                 resumes_limit = -1`,
            [userId]
        );

        console.log(`✅ Checkout completed for user ${userId} - ${tier} tier`);

    } catch (error) {
        console.error('Failed to handle checkout completion:', error);
        throw error;
    }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription, db) {
    try {
        console.log(`✅ Subscription created: ${subscription.id}`);
        // Most work is done in checkout.session.completed
    } catch (error) {
        console.error('Failed to handle subscription creation:', error);
        throw error;
    }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription, db) {
    try {
        const status = subscription.status;
        const customerId = subscription.customer;

        // Get user by Stripe customer ID
        const [users] = await db.pool.execute(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [customerId]
        );

        if (users.length === 0) {
            console.error('User not found for customer:', customerId);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Update subscription status in database
        await db.updateSubscriptionStatus(subscription.id, status, {
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });

        // Update user subscription status
        await db.pool.execute(
            'UPDATE users SET subscription_status = ? WHERE id = ?',
            [status, userId]
        );

        // Handle status changes
        if (status === 'past_due' || status === 'unpaid') {
            console.warn(`⚠️ Subscription past due for user ${userId}`);
            // Could send email notification here
        }

        console.log(`✅ Subscription updated: ${subscription.id} - status: ${status}`);

    } catch (error) {
        console.error('Failed to handle subscription update:', error);
        throw error;
    }
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription, db) {
    try {
        const customerId = subscription.customer;

        // Get user by Stripe customer ID
        const [users] = await db.pool.execute(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [customerId]
        );

        if (users.length === 0) {
            console.error('User not found for customer:', customerId);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Downgrade user to free tier
        await db.updateSubscriptionTier(userId, 'free', 'canceled');

        // Update subscription record
        await db.updateSubscriptionStatus(subscription.id, 'canceled', {
            endedAt: new Date()
        });

        // Reset usage limits to free tier
        await db.pool.execute(
            `UPDATE usage_tracking
             SET jobs_limit = 10,
                 resumes_limit = 1
             WHERE user_id = ?`,
            [userId]
        );

        console.log(`✅ Subscription canceled for user ${userId} - downgraded to free`);

    } catch (error) {
        console.error('Failed to handle subscription deletion:', error);
        throw error;
    }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice, db) {
    try {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;
        const amountPaid = invoice.amount_paid;

        // Get user by Stripe customer ID
        const [users] = await db.pool.execute(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [customerId]
        );

        if (users.length === 0) {
            console.error('User not found for customer:', customerId);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Get subscription record
        const [subscriptions] = await db.pool.execute(
            'SELECT * FROM subscriptions WHERE stripe_subscription_id = ?',
            [subscriptionId]
        );

        const subscriptionRecord = subscriptions[0];

        // Record payment transaction
        await db.createPaymentTransaction(userId, {
            subscriptionId: subscriptionRecord?.id,
            stripePaymentIntentId: invoice.payment_intent,
            stripeChargeId: invoice.charge,
            stripeInvoiceId: invoice.id,
            amountCents: amountPaid,
            currency: invoice.currency,
            status: 'succeeded',
            paymentMethod: 'card',
            description: `Payment for subscription ${subscriptionId}`
        });

        console.log(`✅ Payment succeeded: ${amountPaid} cents for user ${userId}`);

    } catch (error) {
        console.error('Failed to handle payment success:', error);
        throw error;
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice, db) {
    try {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;
        const amountDue = invoice.amount_due;

        // Get user by Stripe customer ID
        const [users] = await db.pool.execute(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [customerId]
        );

        if (users.length === 0) {
            console.error('User not found for customer:', customerId);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Get subscription record
        const [subscriptions] = await db.pool.execute(
            'SELECT * FROM subscriptions WHERE stripe_subscription_id = ?',
            [subscriptionId]
        );

        const subscriptionRecord = subscriptions[0];

        // Record failed payment
        await db.createPaymentTransaction(userId, {
            subscriptionId: subscriptionRecord?.id,
            stripePaymentIntentId: invoice.payment_intent,
            stripeInvoiceId: invoice.id,
            amountCents: amountDue,
            currency: invoice.currency,
            status: 'failed',
            description: `Failed payment for subscription ${subscriptionId}`
        });

        console.warn(`⚠️ Payment failed: ${amountDue} cents for user ${userId}`);
        // Could send email notification here

    } catch (error) {
        console.error('Failed to handle payment failure:', error);
        throw error;
    }
}

module.exports = router;
