// pages/pricing.js - Pricing page with Stripe integration
import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/Pricing.module.css';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleCheckout = async (tier) => {
    try {
      // Call backend to create Stripe checkout session
      const response = await fetch(`${process.env.APP_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tier,
          billingCycle
        })
      });

      const { url } = await response.json();

      // Redirect to Stripe checkout
      window.location.href = url;

    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Pricing - NextRole | Find Your Next Role</title>
        <meta name="description" content="Simple, transparent pricing for NextRole. Start free and upgrade when you need more features to land your dream job." />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.hero}>
            <h1>Simple, Transparent Pricing</h1>
            <p>Choose the plan that fits your job search needs</p>

            {/* Billing Toggle */}
            <div className={styles.billingToggle}>
              <button
                className={billingCycle === 'monthly' ? styles.active : ''}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={billingCycle === 'yearly' ? styles.active : ''}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly <span className={styles.badge}>Save 20%</span>
              </button>
            </div>
          </section>

          {/* Pricing Cards */}
          <section className={styles.pricing}>
            <div className={styles.pricingGrid}>
              {/* Free Tier */}
              <div className={styles.pricingCard}>
                <div className={styles.cardHeader}>
                  <h2>Free</h2>
                  <div className={styles.price}>
                    <span className={styles.amount}>$0</span>
                    <span className={styles.period}>/forever</span>
                  </div>
                  <p>Perfect for getting started</p>
                </div>

                <ul className={styles.features}>
                  <li><span className={styles.check}>✓</span> 10 job listings</li>
                  <li><span className={styles.check}>✓</span> 1 resume</li>
                  <li><span className={styles.check}>✓</span> Browser extension</li>
                  <li><span className={styles.check}>✓</span> Local storage only</li>
                  <li><span className={styles.check}>✓</span> Community support</li>
                  <li><span className={styles.cross}>✗</span> Cloud sync</li>
                  <li><span className={styles.cross}>✗</span> Encryption</li>
                  <li><span className={styles.cross}>✗</span> AI assistant</li>
                </ul>

                <button className={styles.btnSecondary} onClick={() => window.location.href = `${process.env.APP_URL}/signup`}>
                  Get Started
                </button>
              </div>

              {/* Pro Tier */}
              <div className={`${styles.pricingCard} ${styles.featured}`}>
                <div className={styles.badge}>Most Popular</div>

                <div className={styles.cardHeader}>
                  <h2>Pro</h2>
                  <div className={styles.price}>
                    <span className={styles.amount}>
                      ${billingCycle === 'monthly' ? '9.99' : '7.99'}
                    </span>
                    <span className={styles.period}>/month</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className={styles.savings}>Billed annually at $95.88</p>
                  )}
                  <p>Best for active job seekers</p>
                </div>

                <ul className={styles.features}>
                  <li><span className={styles.check}>✓</span> <strong>Unlimited</strong> job listings</li>
                  <li><span className={styles.check}>✓</span> <strong>Unlimited</strong> resumes</li>
                  <li><span className={styles.check}>✓</span> <strong>Cloud sync</strong> across devices</li>
                  <li><span className={styles.check}>✓</span> <strong>Zero-knowledge encryption</strong></li>
                  <li><span className={styles.check}>✓</span> <strong>AI assistant</strong> for cover letters</li>
                  <li><span className={styles.check}>✓</span> <strong>Mobile apps</strong> (iOS & Android)</li>
                  <li><span className={styles.check}>✓</span> Email support (24h response)</li>
                  <li><span className={styles.check}>✓</span> Priority features</li>
                </ul>

                <button className={styles.btnPrimary} onClick={() => handleCheckout('pro')}>
                  Start Pro Trial
                </button>
                <p className={styles.trial}>7-day free trial, cancel anytime</p>
              </div>

              {/* Enterprise Tier */}
              <div className={styles.pricingCard}>
                <div className={styles.cardHeader}>
                  <h2>Enterprise</h2>
                  <div className={styles.price}>
                    <span className={styles.amount}>
                      ${billingCycle === 'monthly' ? '29.99' : '24.99'}
                    </span>
                    <span className={styles.period}>/month</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className={styles.savings}>Billed annually at $299.88</p>
                  )}
                  <p>For teams and power users</p>
                </div>

                <ul className={styles.features}>
                  <li><span className={styles.check}>✓</span> <strong>Everything in Pro</strong></li>
                  <li><span className={styles.check}>✓</span> <strong>API access</strong> for integrations</li>
                  <li><span className={styles.check}>✓</span> <strong>Team features</strong> (multi-user)</li>
                  <li><span className={styles.check}>✓</span> <strong>SSO</strong> (SAML/OAuth)</li>
                  <li><span className={styles.check}>✓</span> <strong>Priority support</strong> (4h response)</li>
                  <li><span className={styles.check}>✓</span> <strong>Dedicated account manager</strong></li>
                  <li><span className={styles.check}>✓</span> Custom integrations</li>
                  <li><span className={styles.check}>✓</span> SLA guarantee</li>
                </ul>

                <button className={styles.btnSecondary} onClick={() => handleCheckout('enterprise')}>
                  Start Enterprise Trial
                </button>
                <p className={styles.trial}>14-day free trial, cancel anytime</p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className={styles.faq}>
            <h2>Frequently Asked Questions</h2>

            <div className={styles.faqGrid}>
              <div className={styles.faqItem}>
                <h3>Can I switch plans later?</h3>
                <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </div>

              <div className={styles.faqItem}>
                <h3>What payment methods do you accept?</h3>
                <p>We accept all major credit cards (Visa, MasterCard, Amex) via Stripe. All payments are secure and encrypted.</p>
              </div>

              <div className={styles.faqItem}>
                <h3>Can I cancel anytime?</h3>
                <p>Absolutely! Cancel anytime with no penalties. You'll continue to have access until the end of your billing period.</p>
              </div>

              <div className={styles.faqItem}>
                <h3>Do you offer refunds?</h3>
                <p>Yes, we offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment, no questions asked.</p>
              </div>

              <div className={styles.faqItem}>
                <h3>Is my data secure?</h3>
                <p>Very! Pro and Enterprise plans use zero-knowledge encryption, meaning your data is encrypted on your device before syncing. We can't read it even if we wanted to.</p>
              </div>

              <div className={styles.faqItem}>
                <h3>How does the free trial work?</h3>
                <p>Start your free trial without entering a credit card. After the trial, you'll need to add payment to continue using Pro/Enterprise features.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className={styles.cta}>
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of successful job seekers today</p>
            <button className={styles.btnPrimary} onClick={() => handleCheckout('pro')}>
              Start Free Trial
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
