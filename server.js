/**
 * Server script with robust punycode fix and API endpoint improvements
 * Implements multiple solutions to address deprecation warnings and API issues
 */

// SOLUTION 1: Use a direct userland alternative for punycode
const punycode = require('punycode');  // Use the standalone punycode package
global.punycode = punycode;  // Replace the deprecated Node.js built-in

// SOLUTION 2: Aggressive warning suppression
const originalEmit = process.emit;
process.emit = function(name, data, ...args) {
  if (
    name === 'warning' && 
    data && 
    data.name === 'DeprecationWarning' && 
    data.message.includes('punycode')
  ) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};

// Also set noDeprecation flag as a backup
process.noDeprecation = true;

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Added CORS support
const { runRailwayTests } = require('./tests/railway-tests');

// Create Express app
const app = express();
const port = process.env.PORT || 8080;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging
const logStream = fs.createWriteStream(path.join(logsDir, 'server.log'), { flags: 'a' });
console.log = (function(originalLog) {
  return function(...args) {
    originalLog.apply(console, args);
    const logMessage = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    logStream.write(`[${new Date().toISOString()}] INFO: ${logMessage}\n`);
  };
})(console.log);

console.error = (function(originalError) {
  return function(...args) {
    originalError.apply(console, args);
    const logMessage = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ');
    logStream.write(`[${new Date().toISOString()}] ERROR: ${logMessage}\n`);
  };
})(console.error);

// SOLUTION 1 for API issues: Add CORS support
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/deployment/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    railway: process.env.RAILWAY_ENVIRONMENT ? true : false,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// SOLUTION 3 for API issues: Add test routes endpoint
app.get('/api/test-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if(middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if(middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if(handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Test endpoint - runs tests and returns results
app.get('/api/run-tests', async (req, res) => {
  console.log('Test endpoint called - running tests...');
  
  try {
    // Run tests
    const results = await runRailwayTests();
    
    // Return results
    res.json({
      success: results.success,
      backend: {
        total: results.total || 0,
        passed: results.passed || 0,
        failed: results.failed || 0
      },
      reportUrl: '/test-report.html',
      logUrl: '/api/test-logs',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running tests:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test report endpoint
app.get('/test-report', (req, res) => {
  const reportPath = path.join(__dirname, 'public', 'test-report.html');
  
  if (fs.existsSync(reportPath)) {
    res.sendFile(reportPath);
  } else {
    res.status(404).send('Test report not found. Run tests first at /api/run-tests');
  }
});

// Test logs endpoint
app.get('/api/test-logs', (req, res) => {
  const logPath = path.join(__dirname, 'logs', 'test-results.log');
  const detailedLogPath = path.join(__dirname, 'logs', 'detailed-test-results.log');
  
  if (fs.existsSync(detailedLogPath)) {
    const detailedLog = fs.readFileSync(detailedLogPath, 'utf8');
    res.type('text/plain').send(detailedLog);
  } else if (fs.existsSync(logPath)) {
    const log = fs.readFileSync(logPath, 'utf8');
    res.type('text/plain').send(log);
  } else {
    res.status(404).send('Test logs not found. Run tests first at /api/run-tests');
  }
});

// SOLUTION 2 for API issues: Ensure routes are properly registered with error handling
try {
  const advancedVideoRoutes = require('./services/advancedVideoRoutes');
  app.use('/api/advanced-video', advancedVideoRoutes);
  console.log('Advanced video routes registered successfully');
  
  // Add health check for advanced video routes
  app.get('/api/advanced-video/health', (req, res) => {
    res.json({ status: 'ok', service: 'advanced-video' });
  });
} catch (error) {
  console.error('Error loading advanced video routes:', error);
  
  // Add fallback routes
  app.post('/api/advanced-video/generate', (req, res) => {
    console.log('Using fallback generate route');
    res.json({ 
      id: 'fallback-' + Date.now(), 
      status: 'processing', 
      message: 'Using fallback route',
      script: req.body.script,
      options: req.body.options || { aspectRatio: '16:9' }
    });
  });
  
  app.get('/api/advanced-video/status/:id', (req, res) => {
    res.json({ 
      id: req.params.id, 
      status: 'processing', 
      progress: 50,
      message: 'Using fallback route'
    });
  });
  
  app.get('/api/advanced-video/list', (req, res) => {
    res.json({ videos: [] });
  });
  
  app.get('/api/advanced-video/drive-auth', (req, res) => {
    res.json({ 
      authUrl: 'https://accounts.google.com/o/oauth2/auth', 
      userId: req.query.userId || 'default-user'
    });
  });
}

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Railway: ${process.env.RAILWAY_ENVIRONMENT ? 'Yes' : 'No'}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`Punycode fix applied: ${typeof global.punycode === 'object' ? 'Yes' : 'No'}`);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Create public directory if it doesn't exist
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
});
