const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Check if www directory exists and contains index.html
const wwwPath = path.join(__dirname, 'www');
const indexPath = path.join(wwwPath, 'index.html');
const hasAngularBuild = fs.existsSync(indexPath);

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

app.get('/api/deployment/status', (req, res) => {
  res.json({ 
    status: 'active', 
    version: '1.0.0',
    angularBuildAvailable: hasAngularBuild
  });
});

// If Angular build exists, serve it
if (hasAngularBuild) {
  console.log('Angular build detected, serving from www directory');
  // Serve static files from the 'www' directory
  app.use(express.static(wwwPath));
  
  // TikTok callback route
  app.get('/tiktok/callback', (req, res) => {
    res.sendFile(indexPath);
  });
  
  // Catch all routes and return the index file for Angular routing
  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  // Serve a placeholder page if Angular build is not available
  console.log('Angular build not detected, serving placeholder page');
  
  app.get('*', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Engine</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f7fa;
          }
          header {
            background-color: #4285f4;
            color: white;
            padding: 1rem;
            text-align: center;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 1rem;
          }
          .status-box {
            background-color: #e3f2fd;
            border-radius: 4px;
            padding: 1rem;
            margin-bottom: 1rem;
          }
          .card {
            background-color: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .success-icon {
            color: #0f9d58;
          }
          h1 {
            margin-top: 0;
          }
          a {
            color: #4285f4;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Video Engine</h1>
        </header>
        <div class="container">
          <div class="status-box">
            <span class="success-icon">✅</span> Server is running successfully!
          </div>
          <div class="card">
            <h2>Bulk AI Video Creation Web App</h2>
            <p>This is a placeholder page for the Video Engine application. The server is running correctly, but the full frontend is still being configured.</p>
            <p>API Health Check: <a href="/api/health">/api/health</a></p>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
