// components/Footer.js - Site footer
import Link from 'next/link';
import styles from '../styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerColumn}>
            <h3>Product</h3>
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/download">Download</Link>
            <Link href="/roadmap">Roadmap</Link>
          </div>

          <div className={styles.footerColumn}>
            <h3>Resources</h3>
            <Link href="/blog">Blog</Link>
            <Link href="/guides">Guides</Link>
            <Link href="/help">Help Center</Link>
            <Link href="/api-docs">API Docs</Link>
          </div>

          <div className={styles.footerColumn}>
            <h3>Company</h3>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/press">Press Kit</Link>
          </div>

          <div className={styles.footerColumn}>
            <h3>Legal</h3>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/security">Security</Link>
            <Link href="/gdpr">GDPR</Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} NextRole. All rights reserved.
          </div>
          <div className={styles.social}>
            <a href="https://twitter.com/nextrole" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://github.com/chrisrobison/nextrole" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://linkedin.com/company/nextrole" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
