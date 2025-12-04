# 🔧 Integration Guide: Connecting All Monetization Features

This guide shows you how to integrate all the new monetization features into your existing application.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install Dependencies](#install-dependencies)
3. [Configure Environment](#configure-environment)
4. [Update server/index.js](#update-serverindexjs)
5. [Run Database Migration](#run-database-migration)
6. [Test the Integration](#test-the-integration)
7. [Deploy Marketing Site](#deploy-marketing-site)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ MySQL 8.0+ installed and running
- ✅ Node.js 18+ installed
- ✅ Stripe account (test mode) created
- ✅ OAuth apps created (Google, GitHub, LinkedIn)
- ✅ SMTP or SendGrid account for emails

---

## Install Dependencies

First, install all new npm packages:

```bash
cd /path/to/nextrole

# Install monetization dependencies
npm install mysql2 stripe passport passport-google-oauth20 passport-github2 passport-linkedin-oauth2 nodemailer express-rate-limit helmet cors
```

For the marketing site:

```bash
cd marketing-site
npm install
```

---

## Configure Environment

1. **Copy .env.example to .env:**

```bash
cp .env.example .env
```

2. **Fill in your credentials in .env:**

Critical values to set:

- `MYSQL_PASSWORD` - Your MySQL root password
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `STRIPE_SECRET_KEY` - From Stripe dashboard
- `STRIPE_PUBLISHABLE_KEY` - From Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` - From Stripe webhook settings
- OAuth credentials (Google, GitHub, LinkedIn)
- Email credentials (SMTP or SendGrid)

3. **Create Stripe Products:**

Go to https://dashboard.stripe.com/products and create:

- **Pro Monthly**: $9.99/month recurring
- **Pro Yearly**: $95.88/year recurring (20% discount)
- **Enterprise Monthly**: $29.99/month recurring
- **Enterprise Yearly**: $299.88/year recurring (20% discount)

Copy the Price IDs into your `.env` file.

---

## Update server/index.js

Replace your existing `server/index.js` with this integrated version:

```javascript
// server/index.js - Main server with monetization features
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Database Services
const MySQLDatabaseService = require('./services/mysql-db-service');
const StripeService = require('./services/stripe-service');
const OAuthService = require('./services/oauth-service');
const EmailService = require('./services/email-service');
const AdminService = require('./services/admin-service');

// Routes
const initializeAuthRoutes = require('./routes/auth-mysql');
const initializeOAuthRoutes = require('./routes/oauth');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentsRoutes = require('./routes/payments');
const initializeAdminRoutes = require('./routes/admin');

// Middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Security & Middleware
// ============================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// ============================================================
// Initialize Services
// ============================================================

const db = new MySQLDatabaseService();
const stripeService = new StripeService();
const emailService = new EmailService(db);
const oauthService = new OAuthService(db);
const adminService = new AdminService(db, stripeService);

// Initialize services
(async () => {
  try {
    await db.initialize();
    console.log('✅ MySQL database connected');

    stripeService.initialize();
    console.log('✅ Stripe service initialized');

    await emailService.initialize();
    console.log('✅ Email service initialized');

    oauthService.initialize();
    console.log('✅ OAuth service initialized');

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
})();

// ============================================================
// Passport Setup (OAuth)
// ============================================================

const passport = oauthService.getPassport();
app.use(passport.initialize());

// ============================================================
// API Routes
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication routes (MySQL-based)
const authRoutes = initializeAuthRoutes(db, emailService);
app.use('/api/auth', authRoutes);

// OAuth routes
const oauthRoutes = initializeOAuthRoutes(oauthService, (user) => {
  // Generate JWT token for OAuth users
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
});
app.use('/api/oauth', oauthRoutes);

// Subscription routes (requires authentication)
app.use('/api/subscriptions', authenticateToken, subscriptionRoutes);

// Payment routes (Stripe integration)
app.use('/api/payments', paymentsRoutes);

// Admin routes (requires admin authentication)
const adminRoutes = initializeAdminRoutes(adminService);
app.use('/api/admin', authenticateToken, adminRoutes);

// ============================================================
// Existing Routes (Keep your existing routes here)
// ============================================================

// Import your existing routes
// const jobRoutes = require('./routes/jobs');
// const resumeRoutes = require('./routes/resumes');
// etc...

// app.use('/api/jobs', authenticateToken, jobRoutes);
// app.use('/api/resumes', authenticateToken, resumeRoutes);
// etc...

// ============================================================
// Error Handling
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.captureException(err);
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`💳 Stripe: ${stripeService.initialized ? 'Connected' : 'Not configured'}`);
  console.log(`📧 Email: ${emailService.transporter ? 'Connected' : 'Mock mode'}`);
  console.log(`🔐 OAuth: ${oauthService.initialized ? 'Enabled' : 'Disabled'}`);
  console.log('\n✅ Monetization features active!\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏳ SIGTERM received, shutting down gracefully...');

  await db.close();
  console.log('✅ Database connections closed');

  process.exit(0);
});

module.exports = app;
```

---

## Run Database Migration

1. **Create MySQL database:**

```bash
mysql -u root -p
```

```sql
CREATE DATABASE jobtool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

2. **Import schema:**

```bash
mysql -u root -p jobtool < server/db/mysql-schema.sql
```

3. **Migrate data from SQLite (if you have existing data):**

```bash
# Dry run first (see what will happen)
node server/scripts/migrate-sqlite-to-mysql.js --dry-run

# Actual migration
node server/scripts/migrate-sqlite-to-mysql.js
```

4. **Verify migration:**

```bash
mysql -u root -p jobtool -e "SELECT COUNT(*) as users FROM users;"
mysql -u root -p jobtool -e "SHOW TABLES;"
```

---

## Test the Integration

### 1. Start the server:

```bash
npm start
```

### 2. Test health endpoint:

```bash
curl http://localhost:3000/health
```

### 3. Test authentication:

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'
```

### 4. Test subscription endpoints:

```bash
# Get subscription tiers
curl http://localhost:3000/api/subscriptions/tiers
```

### 5. Test Stripe checkout (requires auth token):

```bash
curl -X POST http://localhost:3000/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"tier":"pro","billingCycle":"monthly"}'
```

### 6. Test OAuth (in browser):

Visit: http://localhost:3000/api/oauth/google

### 7. Test admin endpoints (requires admin auth):

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Deploy Marketing Site

### Development:

```bash
cd marketing-site
npm run dev
```

Visit: http://localhost:3001

### Production (Vercel):

1. **Install Vercel CLI:**

```bash
npm install -g vercel
```

2. **Deploy:**

```bash
cd marketing-site
vercel --prod
```

3. **Set environment variables in Vercel dashboard:**

- `APP_URL` = https://your-api-domain.com
- `STRIPE_PUBLISHABLE_KEY` = pk_live_...

---

## Troubleshooting

### Database connection fails

```
Error: ER_ACCESS_DENIED_ERROR
```

**Fix:** Check MYSQL_PASSWORD in .env

### Stripe webhook fails

```
Error: No signatures found matching the expected signature
```

**Fix:**
1. Run `stripe listen --forward-to localhost:3000/api/payments/webhooks`
2. Copy webhook secret to STRIPE_WEBHOOK_SECRET in .env

### OAuth redirect fails

```
Error: Redirect URI mismatch
```

**Fix:**
1. Check OAuth app settings in provider dashboard
2. Ensure callback URLs match exactly
3. Use http://localhost:3000 for development, not 127.0.0.1

### Email not sending

```
Email service initialization failed
```

**Fix:**
- For Gmail: Enable "Less secure app access" or use App Password
- For SendGrid: Verify API key is correct
- Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

### JWT token invalid

```
Error: JsonWebTokenError: invalid signature
```

**Fix:** Ensure JWT_SECRET is set and consistent

---

## Next Steps

After integration is complete:

1. ✅ Run end-to-end tests
2. ✅ Set up Stripe test mode webhooks
3. ✅ Test all OAuth flows
4. ✅ Test email verification
5. ✅ Test subscription upgrades/downgrades
6. ✅ Test tier enforcement (Free users hit limits)
7. ✅ Configure production environment variables
8. ✅ Set up SSL certificates
9. ✅ Configure domain DNS
10. ✅ Enable Stripe live mode
11. ✅ Deploy to production!

---

## Support

If you need help:

- **Stripe:** https://stripe.com/docs/billing
- **MySQL:** https://dev.mysql.com/doc/
- **OAuth:** Provider-specific documentation
- **Next.js:** https://nextjs.org/docs

---

**You've got this!** 🚀
