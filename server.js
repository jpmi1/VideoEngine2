const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const morgan = require('morgan');

// Suppress punycode deprecation warning
process.noDeprecation = true;

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
    console.log('Loaded environment variables from .env file');
  } catch (error) {
    console.warn('Warning: dotenv not available or .env file not found');
  }
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log stream
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: accessLogStream }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Debug route to verify server is working
app.get('/api/debug', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
try {
  console.log('Attempting to register advanced video routes...');
  const advancedVideoRoutes = require('./services/advancedVideoRoutes');
  app.use('/api/advanced-video', advancedVideoRoutes);
  console.log('Advanced video routes registered successfully');
  
  // Log registered routes for debugging
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`Route: ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`Route: ${handler.route.path}`);
        }
      });
    }
  });
} catch (error) {
  console.error('Error loading advanced video routes:', error);
  // Add fallback routes
  app.post('/api/advanced-video/generate', (req, res) => {
    console.log('Using fallback route for /api/advanced-video/generate');
    res.json({ 
      id: `fallback-${Date.now()}`, 
      status: 'processing', 
      message: 'Using fallback route' 
    });
  });
  
  app.get('/api/advanced-video/status/:taskId', (req, res) => {
    res.json({ 
      id: req.params.taskId, 
      status: 'processing', 
      message: 'Using fallback route' 
    });
  });
}

// Simple route test endpoint
app.get('/api/route-test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Route test successful',
    routes: {
      generate: '/api/advanced-video/generate',
      status: '/api/advanced-video/status/:taskId',
      upload: '/api/advanced-video/upload-to-drive',
      download: '/api/advanced-video/drive-download/:fileId'
    }
  });
});

// Test routes
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
            path: middleware.regexp.toString() + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Direct API route for video generation (bypass router)
app.post('/direct-api/advanced-video/generate', (req, res) => {
  console.log('Using direct route for video generation');
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Missing required parameter: prompt' 
      });
    }
    
    // Return mock response
    res.json({
      id: `direct-${Date.now()}`,
      status: 'submitted',
      message: 'Video generation task submitted via direct route',
      prompt: prompt,
      options: options
    });
  } catch (error) {
    console.error('Error in direct generate route:', error);
    res.status(500).json({ 
      error: `Failed to process request: ${error.message}` 
    });
  }
});

// Environment variables check endpoint
app.get('/api/env-check', (req, res) => {
  const envVars = {
    KLING_API_KEY_ID: process.env.KLING_API_KEY_ID ? 'Set' : 'Not set',
    KLING_API_KEY_SECRET: process.env.KLING_API_KEY_SECRET ? 'Set' : 'Not set',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
  
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    environmentVariables: envVars
  });
});

// Test endpoints
app.use('/api/run-tests', require('./tests/railway-tests'));
app.get('/test-report', (req, res) => {
  res.sendFile(path.join(__dirname, 'logs', 'test-report.html'));
});
app.get('/api/test-logs', (req, res) => {
  try {
    const testLogs = fs.readFileSync(path.join(logsDir, 'test-results.log'), 'utf8');
    res.type('text/plain').send(testLogs);
  } catch (error) {
    res.status(404).send('Test logs not found. Run tests first.');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  // Only serve index.html for HTML requests, not API requests
  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log environment variables status (without revealing values)
  console.log('Environment variables status:');
  console.log(`- KLING_API_KEY_ID: ${process.env.KLING_API_KEY_ID ? 'Set' : 'Not set'}`);
  console.log(`- KLING_API_KEY_SECRET: ${process.env.KLING_API_KEY_SECRET ? 'Set' : 'Not set'}`);
  console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}`);
  console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'}`);
  console.log(`- GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? 'Set' : 'Not set'}`);
});
