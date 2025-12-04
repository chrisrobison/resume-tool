// pages/terms.js - Terms of Service page
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service - NextRole</title>
        <meta name="description" content="Terms of Service for NextRole - Career management platform" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Header />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1>Terms of Service</h1>
        <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>

        <section style={{ marginTop: '40px' }}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using NextRole ("the Service"), you agree to be bound by these Terms of Service ("Terms").
            If you do not agree to these Terms, please do not use the Service.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>2. Description of Service</h2>
          <p>
            NextRole is a professional career management platform that helps users organize their job search, optimize resumes,
            track applications, and leverage AI-powered insights. We offer both free and paid subscription tiers with varying features.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>3. User Accounts</h2>

          <h3>3.1 Account Creation</h3>
          <ul>
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must be at least 16 years old to create an account</li>
            <li>One person or legal entity may maintain only one free account</li>
          </ul>

          <h3>3.2 Account Security</h3>
          <ul>
            <li>You are responsible for all activity under your account</li>
            <li>You must notify us immediately of any unauthorized access</li>
            <li>We are not liable for losses caused by unauthorized use of your account</li>
          </ul>

          <h3>3.3 Account Termination</h3>
          <ul>
            <li>You may delete your account at any time from the account settings</li>
            <li>We may suspend or terminate accounts that violate these Terms</li>
            <li>Upon termination, your data will be deleted per our Privacy Policy</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>4. Subscription Plans</h2>

          <h3>4.1 Free Tier</h3>
          <ul>
            <li>Limited to 10 job listings and 1 resume</li>
            <li>Local storage only (no cloud sync)</li>
            <li>No access to premium features</li>
            <li>Subject to availability and may be discontinued</li>
          </ul>

          <h3>4.2 Pro Tier ($9.99/month)</h3>
          <ul>
            <li>Unlimited job listings and resumes</li>
            <li>Cloud sync across devices</li>
            <li>Zero-knowledge encryption</li>
            <li>AI assistant features</li>
            <li>Email support (24-hour response time)</li>
          </ul>

          <h3>4.3 Enterprise Tier ($29.99/month)</h3>
          <ul>
            <li>All Pro features</li>
            <li>API access</li>
            <li>Team collaboration features</li>
            <li>SSO (Single Sign-On)</li>
            <li>Priority support (4-hour response time)</li>
            <li>Dedicated account manager</li>
          </ul>

          <h3>4.4 Plan Changes</h3>
          <ul>
            <li>We reserve the right to modify pricing with 30 days' notice</li>
            <li>Existing subscribers are grandfathered at their current price for 12 months</li>
            <li>You can upgrade or downgrade your plan at any time</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>5. Payment Terms</h2>

          <h3>5.1 Billing</h3>
          <ul>
            <li>Subscriptions are billed monthly or annually in advance</li>
            <li>Payment is processed securely through Stripe</li>
            <li>All prices are in USD unless otherwise stated</li>
            <li>You authorize us to charge your payment method for recurring subscriptions</li>
          </ul>

          <h3>5.2 Refunds</h3>
          <ul>
            <li><strong>30-Day Money-Back Guarantee:</strong> Full refund if canceled within 30 days of initial purchase</li>
            <li><strong>Partial Refunds:</strong> Prorated refunds for annual plans canceled after 30 days</li>
            <li><strong>No Refunds:</strong> Monthly subscriptions are not refundable after 30 days</li>
            <li>To request a refund, contact <a href="mailto:billing@jobtool.app">billing@jobtool.app</a></li>
          </ul>

          <h3>5.3 Failed Payments</h3>
          <ul>
            <li>If payment fails, we'll retry up to 3 times over 10 days</li>
            <li>Your account may be downgraded to Free tier if payment cannot be collected</li>
            <li>You'll receive email notifications before any downgrade</li>
          </ul>

          <h3>5.4 Cancellation</h3>
          <ul>
            <li>You can cancel your subscription at any time</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
            <li>You'll retain access to paid features until the end of the billing period</li>
            <li>No refunds for partial months</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>6. Acceptable Use</h2>

          <h3>6.1 Permitted Use</h3>
          <p>You may use the Service to:</p>
          <ul>
            <li>Organize and track your job search activities</li>
            <li>Create and manage resumes and cover letters</li>
            <li>Store job-related documents and notes</li>
          </ul>

          <h3>6.2 Prohibited Use</h3>
          <p>You may NOT:</p>
          <ul>
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Upload malware, viruses, or malicious code</li>
            <li>Attempt to hack, disrupt, or overload the Service</li>
            <li>Scrape, spider, or crawl the Service</li>
            <li>Share your account with others</li>
            <li>Use the Service for spam or phishing</li>
            <li>Resell or redistribute the Service</li>
            <li>Reverse engineer the application</li>
          </ul>

          <h3>6.3 Consequences</h3>
          <p>
            Violation of these terms may result in immediate account suspension or termination without refund.
            We reserve the right to report illegal activity to law enforcement.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>7. Intellectual Property</h2>

          <h3>7.1 Our Rights</h3>
          <ul>
            <li>The Service, including design, code, and content, is owned by Job Hunt Manager</li>
            <li>Our trademarks, logos, and branding are protected</li>
            <li>You may not copy, modify, or distribute our intellectual property</li>
          </ul>

          <h3>7.2 Your Rights</h3>
          <ul>
            <li>You retain all rights to content you create (resumes, notes, etc.)</li>
            <li>You grant us a limited license to store and process your content to provide the Service</li>
            <li>You can export your data at any time</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>8. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>.
            Key points:
          </p>
          <ul>
            <li>We use zero-knowledge encryption for Pro and Enterprise users</li>
            <li>We never sell your data</li>
            <li>You can export or delete your data at any time</li>
            <li>We comply with GDPR and CCPA regulations</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>9. Service Availability</h2>

          <h3>9.1 Uptime</h3>
          <ul>
            <li>We target 99.9% uptime (excluding scheduled maintenance)</li>
            <li>Enterprise plans include SLA guarantees</li>
            <li>We'll notify users of scheduled maintenance in advance</li>
          </ul>

          <h3>9.2 Changes to Service</h3>
          <ul>
            <li>We may modify, update, or discontinue features at any time</li>
            <li>We'll provide notice for significant changes</li>
            <li>Continued use after changes constitutes acceptance</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>10. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            We do not guarantee that:
          </p>
          <ul>
            <li>The Service will be uninterrupted or error-free</li>
            <li>Defects will be corrected</li>
            <li>The Service will meet your specific requirements</li>
            <li>Results from using the Service will be accurate or reliable</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, Job Hunt Manager SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>Any indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages exceeding the amount you paid us in the past 12 months</li>
          </ul>
          <p>
            Some jurisdictions do not allow limitations on liability, so these limitations may not apply to you.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Job Hunt Manager from any claims, damages, or expenses
            arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>13. Dispute Resolution</h2>

          <h3>13.1 Governing Law</h3>
          <p>
            These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
          </p>

          <h3>13.2 Arbitration</h3>
          <p>
            Any disputes will be resolved through binding arbitration, except you may bring claims in small claims court.
            You waive the right to participate in class actions.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>14. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We'll notify you of significant changes via email or a notice on the Service.
            Continued use after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>15. Contact Information</h2>
          <p>For questions about these Terms:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:legal@jobtool.app">legal@jobtool.app</a></li>
            <li><strong>Support:</strong> <a href="mailto:support@jobtool.app">support@jobtool.app</a></li>
          </ul>
        </section>

        <section style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Summary (TL;DR)</h3>
          <ul>
            <li>✅ You own your data</li>
            <li>✅ 30-day money-back guarantee</li>
            <li>✅ Cancel anytime</li>
            <li>✅ Fair pricing, no hidden fees</li>
            <li>❌ Don't abuse the service</li>
            <li>❌ Don't share accounts</li>
          </ul>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        main {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #2c3e50;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
        }
        h2 {
          font-size: 1.8rem;
          margin-top: 40px;
          margin-bottom: 15px;
          color: #2c3e50;
        }
        h3 {
          font-size: 1.3rem;
          margin-top: 20px;
          margin-bottom: 10px;
          color: #34495e;
        }
        p {
          margin-bottom: 15px;
        }
        ul {
          margin-left: 20px;
          margin-bottom: 15px;
        }
        li {
          margin-bottom: 8px;
        }
        a {
          color: #3498db;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        strong {
          color: #2c3e50;
        }
      `}</style>
    </>
  );
}
