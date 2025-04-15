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

console.log(`Angular build check: ${hasAngularBuild ? 'FOUND' : 'NOT FOUND'} at ${indexPath}`);
if (hasAngularBuild) {
  try {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    console.log(`Index.html exists with size: ${indexContent.length} bytes`);
    console.log(`First 100 chars: ${indexContent.substring(0, 100)}`);
  } catch (err) {
    console.error(`Error reading index.html: ${err.message}`);
  }
}

// List files in www directory
try {
  if (fs.existsSync(wwwPath)) {
    console.log('Contents of www directory:');
    const files = fs.readdirSync(wwwPath);
    files.forEach(file => {
      const filePath = path.join(wwwPath, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'}, ${stats.size} bytes)`);
    });
  } else {
    console.log('www directory does not exist');
  }
} catch (err) {
  console.error(`Error listing www directory: ${err.message}`);
}

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

app.get('/api/deployment/status', (req, res) => {
  res.json({ 
    status: 'active', 
    version: '1.0.0',
    angularBuildAvailable: hasAngularBuild,
    serverTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
});

// Force refresh middleware to prevent caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve Angular application - PRIORITIZED
if (hasAngularBuild) {
  console.log('Angular build detected, serving from www directory');
  
  // Serve static files from the 'www' directory
  app.use(express.static(wwwPath, {
    etag: false,
    lastModified: false
  }));
  
  // Explicitly define routes for Angular app
  app.get('/dashboard', (req, res) => {
    console.log('Serving dashboard route');
    res.sendFile(indexPath);
  });
  
  app.get('/index.html', (req, res) => {
    console.log('Serving index.html directly');
    res.sendFile(indexPath);
  });
  
  // TikTok callback route
  app.get('/tiktok/callback', (req, res) => {
    console.log('Serving TikTok callback route');
    res.sendFile(indexPath);
  });
  
  // Catch all routes and return the index file for Angular routing
  app.get('*', (req, res) => {
    console.log(`Serving catch-all route: ${req.originalUrl}`);
    res.sendFile(indexPath);
  });
} else {
  // Serve a placeholder page if Angular build is not available
  console.log('Angular build not detected, serving placeholder page');
  
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
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
            <p>Deployment Status: <a href="/api/deployment/status">/api/deployment/status</a></p>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Angular build available: ${hasAngularBuild}`);
  console.log(`Current directory: ${__dirname}`);
  console.log(`www path: ${wwwPath}`);
  console.log(`index path: ${indexPath}`);
});
