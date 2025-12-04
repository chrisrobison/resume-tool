// components/Header.js - Site header with navigation
import Link from 'next/link';
import { useState } from 'react';
import styles from '../styles/Header.module.css';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/">
            <span className={styles.logoIcon}>🎯</span>
            <span className={styles.logoText}>NextRole</span>
          </Link>
        </div>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ''}`}>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/blog">Blog</Link>
        </nav>

        <div className={styles.actions}>
          <Link href={`${process.env.APP_URL}/login`} className={styles.btnLogin}>
            Login
          </Link>
          <Link href={`${process.env.APP_URL}/signup`} className={styles.btnSignup}>
            Get Started
          </Link>
        </div>

        <button
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}
