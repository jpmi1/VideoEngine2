const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Import route modules - with error handling
let advancedVideoRoutes;
try {
  // Try the original routes first
  advancedVideoRoutes = require('./services/advancedVideoRoutes');
  console.log('Successfully loaded advancedVideoRoutes');
} catch (error) {
  console.error('Error loading advancedVideoRoutes:', error.message);
  // Use the simple routes as fallback
  try {
    advancedVideoRoutes = require('./simple-routes');
    console.log('Using simple routes as fallback');
  } catch (fallbackError) {
    console.error('Error loading simple routes:', fallbackError.message);
    // Create a simple router as fallback
    advancedVideoRoutes = express.Router();
    advancedVideoRoutes.get('/list', (req, res) => {
      res.json({ videos: [], message: 'Fallback route - real routes failed to load' });
    });
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Starting application logs
console.log('Starting application...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Current directory:', __dirname);
console.log('Files in current directory:', fs.readdirSync(__dirname).join(', '));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('Middleware configured');

// Health check endpoint - MUST be before any other routes
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint called');
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Deployment status endpoint
app.get('/api/deployment/status', (req, res) => {
  console.log('Deployment status endpoint called');
  res.status(200).json({
    status: 'active',
    version: '1.0.0',
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// API routes - IMPORTANT: Register API routes BEFORE static files
app.use('/api/advanced-video', advancedVideoRoutes);
console.log('Routes registered');

// Serve static files from the public directory AFTER API routes
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static files middleware configured');

// Catch-all route to serve index.html - MUST be after API routes
app.get('*', (req, res) => {
  console.log('Catch-all route called for:', req.url);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Start server with error handling
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
