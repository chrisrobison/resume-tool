// pages/privacy.js - Privacy Policy page
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - NextRole</title>
        <meta name="description" content="Privacy Policy for NextRole - How we protect your data with zero-knowledge encryption" />
        <meta name="robots" content="index, follow" />
      </Head>

      <Header />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1>Privacy Policy</h1>
        <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>

        <section style={{ marginTop: '40px' }}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to NextRole ("we," "us," or "our"). We respect your privacy and are committed to protecting your personal data.
            This privacy policy explains how we collect, use, and safeguard your information when you use our service.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>2. Zero-Knowledge Encryption</h2>
          <p>
            NextRole uses <strong>zero-knowledge encryption</strong> for Pro and Enterprise users. This means:
          </p>
          <ul>
            <li>Your data is encrypted on your device before being sent to our servers</li>
            <li>We cannot read, access, or decrypt your encrypted data</li>
            <li>Only you have the encryption key (your passphrase)</li>
            <li>Even if our servers were compromised, your data would remain secure</li>
          </ul>
          <p>
            <strong>Important:</strong> If you lose your encryption passphrase, we cannot recover your data. Please keep your passphrase safe and secure.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>3. Information We Collect</h2>

          <h3>3.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email address, name, password</li>
            <li><strong>Job Search Data:</strong> Job listings, resumes, cover letters (encrypted for Pro/Enterprise users)</li>
            <li><strong>Payment Information:</strong> Processed securely by Stripe (we never store your full credit card details)</li>
          </ul>

          <h3>3.2 Automatically Collected Information</h3>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
            <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
            <li><strong>Cookies:</strong> Essential cookies for authentication and preferences</li>
          </ul>

          <h3>3.3 OAuth Authentication</h3>
          <p>
            If you log in via Google, GitHub, or LinkedIn, we receive:
          </p>
          <ul>
            <li>Your email address</li>
            <li>Your name</li>
            <li>Your profile picture (optional)</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>4. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our service</li>
            <li>Process your payments and subscriptions</li>
            <li>Send you service-related notifications (account, billing, security)</li>
            <li>Improve and optimize our platform</li>
            <li>Prevent fraud and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            <strong>We do NOT:</strong>
          </p>
          <ul>
            <li>Sell your personal information to third parties</li>
            <li>Use your job search data for advertising</li>
            <li>Share your encrypted data (we can't - it's encrypted!)</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>5. Data Sharing</h2>
          <p>We only share your data with:</p>

          <h3>5.1 Service Providers</h3>
          <ul>
            <li><strong>Stripe:</strong> Payment processing</li>
            <li><strong>SendGrid/SMTP:</strong> Email delivery</li>
            <li><strong>Cloud Hosting:</strong> Server infrastructure</li>
          </ul>

          <h3>5.2 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or government request.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>6. Data Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul>
            <li>HTTPS/TLS encryption for all data in transit</li>
            <li>AES-256 encryption for data at rest (Pro/Enterprise)</li>
            <li>Regular security audits and updates</li>
            <li>Access controls and authentication</li>
            <li>Secure password hashing (bcrypt)</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>7. Your Rights (GDPR & CCPA)</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Portability:</strong> Export your data in a standard format</li>
            <li><strong>Objection:</strong> Object to certain data processing</li>
            <li><strong>Restriction:</strong> Limit how we process your data</li>
          </ul>
          <p>
            To exercise these rights, contact us at: <a href="mailto:privacy@jobtool.app">privacy@jobtool.app</a>
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>8. Data Retention</h2>
          <p>We retain your data:</p>
          <ul>
            <li><strong>Active accounts:</strong> As long as your account exists</li>
            <li><strong>Deleted accounts:</strong> 30 days (for recovery), then permanently deleted</li>
            <li><strong>Payment records:</strong> 7 years (legal requirement)</li>
            <li><strong>Logs and analytics:</strong> 90 days</li>
          </ul>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>9. Cookies</h2>
          <p>We use essential cookies for:</p>
          <ul>
            <li>Authentication (keeping you logged in)</li>
            <li>Session management</li>
            <li>Security (CSRF protection)</li>
          </ul>
          <p>
            We do NOT use tracking or advertising cookies.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>10. Children's Privacy</h2>
          <p>
            Our service is not intended for users under 16 years of age. We do not knowingly collect personal information from children.
            If you become aware that a child has provided us with personal data, please contact us.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>11. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place,
            including Standard Contractual Clauses (SCCs) for EU data.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of significant changes via email or a notice on our website.
            Continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section style={{ marginTop: '30px' }}>
          <h2>13. Contact Us</h2>
          <p>If you have questions about this privacy policy:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:privacy@jobtool.app">privacy@jobtool.app</a></li>
            <li><strong>Support:</strong> <a href="mailto:support@jobtool.app">support@jobtool.app</a></li>
          </ul>
        </section>

        <section style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Summary (TL;DR)</h3>
          <ul>
            <li>✅ We use zero-knowledge encryption (you control your data)</li>
            <li>✅ We never sell your data</li>
            <li>✅ We respect your privacy rights (GDPR/CCPA)</li>
            <li>✅ You can export or delete your data anytime</li>
            <li>✅ Payments processed securely by Stripe</li>
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
