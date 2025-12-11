// server/index-monetization.js - Integrated server with monetization features
// This is the NEW server file that includes all monetization features
// To use: Copy this to server/index.js (backup the old one first)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Existing services
const { tailorResumeWithClaude } = require('./claudeService');
const { tailorResumeWithChatGPT } = require('./chatgptService');
const jobFeedService = require('./job-feed-service');
const { getInstance: getDbInstance } = require('./services/db-service');

// NEW: Monetization services
const MySQLDatabaseService = require('./services/mysql-db-service');
const StripeService = require('./services/stripe-service');
const OAuthService = require('./services/oauth-service');
const EmailService = require('./services/email-service');
const AdminService = require('./services/admin-service');

// Existing routes
const syncRoutes = require('./routes/sync');
const authRoutes = require('./routes/auth'); // Keep for backward compatibility
const scraperRoutes = require('./routes/scraper');

// NEW: Monetization routes
const initializeAuthRoutesMySQL = require('./routes/auth-mysql');
const initializeOAuthRoutes = require('./routes/oauth');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentsRoutes = require('./routes/payments');
const initializeAdminRoutes = require('./routes/admin');

// Middleware
const { authenticateToken } = require('./middleware/auth');
const tierEnforcement = require('./middleware/tier-enforcement');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const USE_MONETIZATION = process.env.USE_MONETIZATION === 'true' || process.env.NODE_ENV === 'production';

// ============================================================
// Security & Middleware
// ============================================================

// Security headers (helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - Require explicit allowed origins in production
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }
  // Default safe origins for development
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000'];
  }
  // In production without explicit CORS_ORIGIN, deny all cross-origin requests
  return false;
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../')));

// Rate limiting - Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later."
});
app.use('/api/', globalLimiter);

// Rate limiting - Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many authentication attempts, please try again later."
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | IP: ${req.ip}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });

  next();
});

// ============================================================
// Initialize Services
// ============================================================

let mysqlDb, stripeService, emailService, oauthService, adminService;

(async () => {
  try {
    // Initialize SQLite database (existing functionality)
    const db = getDbInstance();
    await db.initialize();
    console.log('✅ SQLite database initialized');

    // Initialize MySQL if monetization is enabled
    if (USE_MONETIZATION) {
      console.log('🚀 Initializing monetization services...');

      // MySQL Database
      mysqlDb = new MySQLDatabaseService();
      await mysqlDb.initialize();
      console.log('✅ MySQL database connected');

      // Stripe Service
      stripeService = new StripeService();
      stripeService.initialize();
      console.log('✅ Stripe service initialized');

      // Email Service
      emailService = new EmailService(mysqlDb);
      await emailService.initialize();
      console.log('✅ Email service initialized');

      // OAuth Service
      oauthService = new OAuthService(mysqlDb);
      oauthService.initialize();
      console.log('✅ OAuth service initialized');

      // Admin Service
      adminService = new AdminService(mysqlDb, stripeService);
      console.log('✅ Admin service initialized');

      // Initialize Passport (OAuth)
      const passport = oauthService.getPassport();
      app.use(passport.initialize());
      console.log('✅ Passport initialized');

    } else {
      console.log('ℹ️ Monetization features disabled (set USE_MONETIZATION=true to enable)');
    }

  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    if (USE_MONETIZATION) {
      console.error('💡 Check your .env file for correct database and API credentials');
      process.exit(1);
    }
  }
})();

// ============================================================
// Health & Status Endpoints
// ============================================================

app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      sqlite: 'connected',
      monetization: USE_MONETIZATION
    }
  };

  if (USE_MONETIZATION && mysqlDb) {
    health.services.mysql = mysqlDb.pool ? 'connected' : 'disconnected';
    health.services.stripe = stripeService?.initialized ? 'initialized' : 'not configured';
    health.services.email = emailService?.transporter ? 'connected' : 'mock mode';
    health.services.oauth = oauthService?.initialized ? 'enabled' : 'disabled';
  }

  res.json(health);
});

app.get('/api/status', (req, res) => {
  res.json({
    version: '2.0.0',
    monetization: USE_MONETIZATION,
    features: {
      subscriptions: USE_MONETIZATION,
      oauth: USE_MONETIZATION && oauthService?.initialized,
      email: USE_MONETIZATION && emailService?.transporter !== null,
      stripe: USE_MONETIZATION && stripeService?.initialized
    }
  });
});

// ============================================================
// Existing Routes (Maintained for backward compatibility)
// ============================================================

// Sync routes (existing)
app.use('/api/sync', syncRoutes);

// Auth routes (existing SQLite-based)
app.use('/api/auth', authRoutes);

// Scraper routes
app.use('/api/scraper', scraperRoutes);

// AI endpoints (existing)
app.post('/api/tailor-resume', async (req, res) => {
  try {
    const { prompt, apiType, apiKey, resume, model } = req.body;

    if (!prompt || !apiType || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let result;
    const type = apiType === 'openai' ? 'chatgpt' : apiType;

    if (type === 'claude') {
      result = await tailorResumeWithClaude(resume, prompt, apiKey, model);
    } else if (type === 'chatgpt') {
      result = await tailorResumeWithChatGPT(resume, prompt, apiKey, model);
    } else {
      return res.status(400).json({ error: 'Invalid API type' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error tailoring resume:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai-request', async (req, res) => {
  try {
    const { prompt, apiType, apiKey, resume, operation, model } = req.body;

    if (!prompt || !apiType || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let result;
    const type = apiType === 'openai' ? 'chatgpt' : apiType;

    if (type === 'claude') {
      result = await tailorResumeWithClaude(resume, prompt, apiKey, model);
    } else if (type === 'chatgpt') {
      result = await tailorResumeWithChatGPT(resume, prompt, apiKey, model);
    } else {
      return res.status(400).json({ error: 'Invalid API type' });
    }

    if (typeof result === 'object' && result.resume) {
      res.json(result.resume);
    } else if (typeof result === 'string') {
      res.json(result);
    } else {
      res.json(result);
    }

  } catch (error) {
    // Sanitize operation name to prevent log injection
    const sanitizedOp = String(req.body.operation || 'unknown').replace(/[^\w-]/g, '').substring(0, 50);
    console.error(`Error in AI request (${sanitizedOp}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Job feed endpoints (existing)
app.get('/api/job-feeds/sources', (req, res) => {
  res.json({ sources: jobFeedService.listSources() });
});

app.get('/api/job-feeds/queue', (req, res) => {
  res.json({
    queue: jobFeedService.getQueue(),
    recent: jobFeedService.getRecentResults(10)
  });
});

app.post('/api/job-feeds/queue', (req, res) => {
  try {
    const { sourceId, keywords = [], filters = {} } = req.body || {};
    if (!sourceId) {
      return res.status(400).json({ error: 'sourceId is required' });
    }
    const task = jobFeedService.enqueueFetch({ sourceId, keywords, filters });
    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/job-feeds/results', (req, res) => {
  try {
    const { taskId, items = [] } = req.body || {};
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }
    const task = jobFeedService.recordResults(taskId, Array.isArray(items) ? items : []);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// NEW: Monetization Routes (Only if enabled)
// ============================================================

if (USE_MONETIZATION) {
  console.log('🔧 Mounting monetization routes...');

  // Authentication routes (MySQL-based)
  const authRoutesMySQL = initializeAuthRoutesMySQL(mysqlDb, emailService);
  app.use('/api/auth/v2', authLimiter, authRoutesMySQL); // v2 to not conflict with existing

  // OAuth routes
  const oauthRoutes = initializeOAuthRoutes(oauthService, (user) => {
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

  console.log('✅ Monetization routes mounted');
}

// ============================================================
// Catch-all route to serve the main app
// ============================================================

const indexRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later."
});

app.get('*', indexRateLimiter, (req, res) => {
  console.log(`[${new Date().toISOString()}] Serving index.html for path: ${req.url}`);
  const filePath = path.join(__dirname, '../index.html');

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error(`[${new Date().toISOString()}] File not found: ${filePath}`);
    res.status(404).send('File not found');
  }
});

// ============================================================
// Error Handling
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(err);
    } catch (e) {
      console.error('Sentry not available:', e.message);
    }
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
// HTTPS Server Setup (Production)
// ============================================================

let httpsServer;
if (process.env.NODE_ENV === 'production') {
  try {
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/netoasis.net/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/netoasis.net/fullchain.pem', 'utf8');
    const credentials = { key: privateKey, cert: certificate };

    httpsServer = https.createServer(credentials, app);

    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`✅ HTTPS Server running on port ${HTTPS_PORT}`);
    });
  } catch (error) {
    console.error('Failed to start HTTPS server:', error);
    console.log('Continuing with HTTP server only...');
  }
}

// ============================================================
// HTTP Server Setup
// ============================================================

const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Job Hunt Manager Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 HTTP:  http://localhost:${PORT}`);
  if (httpsServer) {
    console.log(`📍 HTTPS: https://localhost:${HTTPS_PORT}`);
  }
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💰 Monetization: ${USE_MONETIZATION ? 'ENABLED' : 'DISABLED'}`);

  if (USE_MONETIZATION) {
    console.log('\n🔧 Services:');
    console.log(`   - MySQL: ${mysqlDb?.pool ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   - Stripe: ${stripeService?.initialized ? '✅ Ready' : '⚠️ Not configured'}`);
    console.log(`   - Email: ${emailService?.transporter ? '✅ Connected' : '⚠️ Mock mode'}`);
    console.log(`   - OAuth: ${oauthService?.initialized ? '✅ Enabled' : '⚠️ Disabled'}`);
  }

  console.log('\n📝 Available Routes:');
  console.log('   - GET  /health - Health check');
  console.log('   - GET  /api/status - API status');
  console.log('   - POST /api/auth/* - Authentication');
  console.log('   - POST /api/sync/* - Data sync');
  console.log('   - POST /api/tailor-resume - AI resume tailoring');

  if (USE_MONETIZATION) {
    console.log('   - POST /api/auth/v2/* - Enhanced authentication');
    console.log('   - GET  /api/oauth/* - OAuth login');
    console.log('   - GET  /api/subscriptions/* - Subscription management');
    console.log('   - POST /api/payments/* - Payment processing');
    console.log('   - GET  /api/admin/* - Admin dashboard');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// ============================================================
// Graceful Shutdown
// ============================================================

process.on('SIGTERM', async () => {
  console.log('\n⏳ SIGTERM received, shutting down gracefully...');

  // Close HTTP server
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Close HTTPS server if running
  if (httpsServer) {
    httpsServer.close(() => {
      console.log('✅ HTTPS server closed');
    });
  }

  // Close database connections
  if (USE_MONETIZATION && mysqlDb) {
    await mysqlDb.close();
    console.log('✅ MySQL connections closed');
  }

  console.log('✅ Graceful shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⏳ SIGINT received, shutting down...');
  process.emit('SIGTERM');
});

module.exports = app;
