const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'www' directory
app.use(express.static(path.join(__dirname, 'www')));

// API routes
app.get('/api/deployment/status', (req, res) => {
  res.json({ status: 'active', version: '1.0.0' });
});

app.post('/api/deployment/prepare', (req, res) => {
  res.json({ success: true, message: 'Deployment preparation completed' });
});

// TikTok callback route
app.get('/tiktok/callback', (req, res) => {
  // This route will be handled by the Angular app
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Catch all routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
