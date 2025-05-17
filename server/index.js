const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { tailorResumeWithClaude } = require('./claudeService');
const { tailorResumeWithChatGPT } = require('./chatgptService');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

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

// API endpoints
app.post('/api/tailor-resume', async (req, res) => {
  try {
    const { resume, jobDescription, apiType, apiKey } = req.body;
    
    if (!resume || !jobDescription || !apiType || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }
    
    let result;
    
    if (apiType === 'claude') {
      result = await tailorResumeWithClaude(resume, jobDescription, apiKey);
    } else if (apiType === 'chatgpt') {
      result = await tailorResumeWithChatGPT(resume, jobDescription, apiKey);
    } else {
      return res.status(400).json({ 
        error: 'Invalid API type. Supported types: claude, chatgpt' 
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error tailoring resume:', error);
    res.status(500).json({ 
      error: error.message || 'An error occurred while tailoring your resume' 
    });
  }
});

// Catch-all route to serve the main app
app.get('*', (req, res) => {
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
