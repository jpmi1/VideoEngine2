/**
 * Integration module for the server.js file to include advanced video generation routes
 */

// Update the server.js file to include the advanced video generation routes
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Import route modules
const advancedVideoRoutes = require('./services/advancedVideoRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/advanced-video', advancedVideoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Deployment status endpoint
app.get('/api/deployment/status', (req, res) => {
  const angularBuildAvailable = fs.existsSync(path.join(__dirname, 'www', 'index.html'));
  
  res.json({
    status: 'active',
    version: '1.0.0',
    angularBuildAvailable,
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
