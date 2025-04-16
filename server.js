/**
 * Server script with integrated test endpoint for Railway
 * Serves the application and provides a test endpoint
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { runRailwayTests } = require('./tests/railway-tests');

// Create Express app
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

app.get('/api/deployment/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    railway: process.env.RAILWAY_ENVIRONMENT ? true : false
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
        total: results.backend?.total || 0,
        passed: results.backend?.passed || 0,
        failed: results.backend?.failed || 0
      },
      reportUrl: '/test-report.html',
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
