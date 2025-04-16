/**
 * Server script with integrated test endpoint for Railway
 * Includes punycode deprecation fix and enhanced logging
 */

// Suppress punycode deprecation warning
process.noDeprecation = true;

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
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

// Include advanced video routes
try {
  const advancedVideoRoutes = require('./services/advancedVideoRoutes');
  app.use('/api/advanced-video', advancedVideoRoutes);
} catch (error) {
  console.error('Error loading advanced video routes:', error);
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
