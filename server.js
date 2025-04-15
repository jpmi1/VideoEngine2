const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Import route modules
const advancedVideoRoutes = require('./services/advancedVideoRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Starting application logs
console.log('Starting application...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

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

// API routes - IMPORTANT: Register API routes BEFORE static files
app.use('/api/advanced-video', advancedVideoRoutes);
console.log('Routes registered');

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Deployment status endpoint
app.get('/api/deployment/status', (req, res) => {
  console.log('Deployment status endpoint called');
  res.json({
    status: 'active',
    version: '1.0.0',
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Serve static files from the public directory AFTER API routes
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static files middleware configured');

// Catch-all route to serve index.html - MUST be after API routes
app.get('*', (req, res) => {
  console.log('Catch-all route called for:', req.url);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
console.log(`Starting server on port ${PORT}`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
