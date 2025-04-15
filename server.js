const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Import route modules
const advancedVideoRoutes = require('./services/advancedVideoRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes - IMPORTANT: Register API routes BEFORE static files
app.use('/api/advanced-video', advancedVideoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Deployment status endpoint
app.get('/api/deployment/status', (req, res) => {
  res.json({
    status: 'active',
    version: '1.0.0',
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Serve static files from the public directory AFTER API routes
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html - MUST be after API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
