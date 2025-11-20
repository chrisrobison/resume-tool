const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const rateLimit = require('express-rate-limit');
const { tailorResumeWithClaude } = require('./claudeService');
const { tailorResumeWithChatGPT } = require('./chatgptService');
const jobFeedService = require('./job-feed-service');

// Import new sync and auth routes
const syncRoutes = require('./routes/sync');
const authRoutes = require('./routes/auth');
const scraperRoutes = require('./routes/scraper');
const { getInstance: getDbInstance } = require('./services/db-service');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Initialize database on startup
(async () => {
  try {
    const db = getDbInstance();
    await db.initialize();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Rate limiter for catch-all route serving index.html
const indexRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later."
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../')));

// HTTP to HTTPS redirect middleware
/*
 * app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.url} | Protocol: ${req.protocol} | Secure: ${req.secure}`);
  
  // Skip for HTTPS requests or local development
  if (req.secure || req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
    return next();
  }
  
  // Redirect HTTP to HTTPS
  const httpsUrl = `https://${req.hostname}${req.url}`;
  console.log(`[${new Date().toISOString()}] Redirecting to: ${httpsUrl}`);
  res.redirect(301, httpsUrl);
});
*/

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | IP: ${req.ip}`);
  
  // Add response listener to log completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });
  
  next();
});

// Mount sync and auth routes
app.use('/api/sync', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/scraper', scraperRoutes);

// API endpoints
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

// Generic AI API endpoint for all operations
app.post('/api/ai-request', async (req, res) => {
  try {
    const { prompt, apiType, apiKey, resume, operation, model } = req.body;
    
    if (!prompt || !apiType || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    let result;
    
    // For now, use the same service functions but we can expand later
    const type2 = apiType === 'openai' ? 'chatgpt' : apiType;
    if (type2 === 'claude') {
      result = await tailorResumeWithClaude(resume, prompt, apiKey, model);
    } else if (type2 === 'chatgpt') {
      result = await tailorResumeWithChatGPT(resume, prompt, apiKey, model);
    } else {
      return res.status(400).json({ error: 'Invalid API type' });
    }
    
    // Return the raw result for the worker to parse
    if (typeof result === 'object' && result.resume) {
      // For tailor-resume operations, return the resume content
      res.json(result.resume);
    } else if (typeof result === 'string') {
      // For other operations, return the string result
      res.json(result);
    } else {
      res.json(result);
    }
    
  } catch (error) {
    console.error(`Error in AI request (${req.body.operation}):`, error);
    res.status(500).json({ error: error.message });
  }
});

// Job feed automation endpoints (experimental)
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
    const task = jobFeedService.enqueueFetch({
      sourceId,
      keywords,
      filters
    });
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

// Catch-all route to serve the main app
app.get('*', indexRateLimiter, (req, res) => {
  console.log(`[${new Date().toISOString()}] Serving index.html for path: ${req.url}`);
  const filePath = path.join(__dirname, '../index.html');
  
  // Check if file exists before sending
  if (fs.existsSync(filePath)) {
    console.log(`[${new Date().toISOString()}] File exists: ${filePath}`);
    res.sendFile(filePath);
  } else {
    console.error(`[${new Date().toISOString()}] File not found: ${filePath}`);
    res.status(404).send('File not found');
  }
});

// Set up HTTPS with Let's Encrypt certificates
let httpsServer;
try {
  // Path to Let's Encrypt certificates for netoasis.net
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/netoasis.net/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/netoasis.net/fullchain.pem', 'utf8');
  
  const credentials = { key: privateKey, cert: certificate };
  
  // Create HTTPS server
  httpsServer = https.createServer(credentials, app);
  
  // Start HTTPS server
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
    // Log the paths being served for verification
    console.log(`Serving static files from: ${path.join(__dirname, '../')}`);
    console.log(`Index file path: ${path.join(__dirname, '../index.html')}`);
    
    // Verify file existence
    const indexPath = path.join(__dirname, '../index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`Verified: index.html exists at ${indexPath}`);
    } else {
      console.error(`ERROR: index.html not found at ${indexPath}`);
    }
  });
} catch (error) {
  console.error('Failed to start HTTPS server:', error);
  console.log('Continuing with HTTP server only...');
}

// Start HTTP server (can be used for redirecting to HTTPS or as fallback)
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  // Log the paths being served for verification
  console.log(`Serving static files from: ${path.join(__dirname, '../')}`);
  console.log(`Index file path: ${path.join(__dirname, '../index.html')}`);
  
  // Verify file existence
  const indexPath = path.join(__dirname, '../index.html');
  if (fs.existsSync(indexPath)) {
    console.log(`Verified: index.html exists at ${indexPath}`);
  } else {
    console.error(`ERROR: index.html not found at ${indexPath}`);
  }
});
