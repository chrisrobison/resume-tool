// pages/index.js - Home page
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>NextRole - Find Your Next Role | Professional Career Management Platform</title>
        <meta name="description" content="NextRole helps you find your next role with AI-powered job tracking, resume optimization, and zero-knowledge encryption. Your career, your data, your privacy." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <h1 className={styles.heroTitle}>
              Find Your <span className={styles.highlight}>Next Role</span> with Confidence
            </h1>
            <p className={styles.heroSubtitle}>
              AI-powered career management platform that helps you track applications, optimize resumes, and land your dream job.
              With zero-knowledge encryption, your data stays private - not even we can read it.
            </p>
            <div className={styles.heroCta}>
              <Link href="/pricing" className={styles.btnPrimary}>
                Get Started Free
              </Link>
              <Link href="/features" className={styles.btnSecondary}>
                Learn More →
              </Link>
            </div>
            <p className={styles.heroNote}>
              ✨ No credit card required · 🔒 End-to-end encrypted · 📱 Works on all devices
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className={styles.features}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Everything You Need to Succeed</h2>

            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🎯</div>
                <h3>Job Tracking</h3>
                <p>Track applications, interviews, and offers in one organized place. Never lose track of where you applied.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📄</div>
                <h3>Resume Management</h3>
                <p>Create, edit, and manage multiple resume versions tailored for different roles.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔒</div>
                <h3>Zero-Knowledge Encryption</h3>
                <p>Your data is encrypted on your device before syncing. We can't read it, and neither can anyone else.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>☁️</div>
                <h3>Cloud Sync</h3>
                <p>Access your job search from anywhere. Seamlessly sync across desktop, mobile, and web.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🤖</div>
                <h3>AI Assistant</h3>
                <p>Get intelligent suggestions for cover letters, interview prep, and application optimization.</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔔</div>
                <h3>Smart Reminders</h3>
                <p>Never miss a follow-up or deadline. Automated reminders keep you on track.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className={styles.socialProof}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Join Thousands of Successful Job Seekers</h2>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.statNumber}>10,000+</div>
                <div className={styles.statLabel}>Active Users</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>50,000+</div>
                <div className={styles.statLabel}>Applications Tracked</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>4.9/5</div>
                <div className={styles.statLabel}>User Rating</div>
              </div>
            </div>

            <div className={styles.testimonials}>
              <div className={styles.testimonial}>
                <p>"This tool completely transformed how I organize my job search. I landed my dream job in 6 weeks!"</p>
                <div className={styles.testimonialAuthor}>- Sarah K., Software Engineer</div>
              </div>
              <div className={styles.testimonial}>
                <p>"The privacy features are amazing. Finally, a job tool that respects my data."</p>
                <div className={styles.testimonialAuthor}>- Michael T., Data Analyst</div>
              </div>
              <div className={styles.testimonial}>
                <p>"Clean interface, powerful features. Worth every penny of the Pro subscription."</p>
                <div className={styles.testimonialAuthor}>- Jennifer L., Product Manager</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className={styles.howItWorks}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>How It Works</h2>

            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <h3>Sign Up</h3>
                <p>Create your free account in seconds. No credit card required.</p>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <h3>Add Jobs</h3>
                <p>Save job listings from anywhere using our browser extension or manual entry.</p>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <h3>Track Progress</h3>
                <p>Move jobs through stages: Applied → Interview → Offer. Stay organized effortlessly.</p>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>4</div>
                <h3>Land Your Dream Job</h3>
                <p>Use insights and reminders to follow up at the right time and ace your interviews.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Teaser */}
        <section className={styles.pricingTeaser}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
            <p className={styles.pricingSubtitle}>Start free, upgrade when you need more</p>

            <div className={styles.pricingCards}>
              <div className={styles.pricingCard}>
                <h3>Free</h3>
                <div className={styles.price}>$0<span>/month</span></div>
                <ul className={styles.pricingFeatures}>
                  <li>✓ 10 job listings</li>
                  <li>✓ 1 resume</li>
                  <li>✓ Browser extension</li>
                  <li>✓ Local storage</li>
                </ul>
                <Link href="/pricing" className={styles.btnSecondary}>Get Started</Link>
              </div>

              <div className={`${styles.pricingCard} ${styles.featured}`}>
                <div className={styles.badge}>Most Popular</div>
                <h3>Pro</h3>
                <div className={styles.price}>$9.99<span>/month</span></div>
                <ul className={styles.pricingFeatures}>
                  <li>✓ Unlimited jobs</li>
                  <li>✓ Unlimited resumes</li>
                  <li>✓ Cloud sync</li>
                  <li>✓ Encryption</li>
                  <li>✓ AI assistant</li>
                  <li>✓ Mobile apps</li>
                </ul>
                <Link href="/pricing" className={styles.btnPrimary}>Start Pro Trial</Link>
              </div>

              <div className={styles.pricingCard}>
                <h3>Enterprise</h3>
                <div className={styles.price}>$29.99<span>/month</span></div>
                <ul className={styles.pricingFeatures}>
                  <li>✓ Everything in Pro</li>
                  <li>✓ API access</li>
                  <li>✓ Team features</li>
                  <li>✓ SSO</li>
                  <li>✓ Priority support</li>
                </ul>
                <Link href="/pricing" className={styles.btnSecondary}>Learn More</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <div className={styles.container}>
            <h2>Ready to Organize Your Job Search?</h2>
            <p>Join thousands of successful job seekers today</p>
            <Link href="/pricing" className={styles.btnPrimary}>
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
