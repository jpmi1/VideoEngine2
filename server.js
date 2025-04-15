const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Import service modules
const videoGenerationService = require('./services/videoGenerationService');
const googleDriveService = require('./services/googleDriveService');

const app = express();
const port = process.env.PORT || 8080;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  }
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

app.get('/api/deployment/status', (req, res) => {
  res.json({ 
    status: 'active', 
    version: '1.0.0',
    serverTime: new Date().toISOString()
  });
});

// Video Generation API endpoints
app.post('/api/video/generate', async (req, res) => {
  try {
    const { title, description, style, duration } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const requestId = uuidv4();
    
    // Store the request in memory (in a real app, this would be in a database)
    videoGenerationService.createRequest({
      id: requestId,
      title,
      description,
      style: style || 'default',
      duration: duration || 30,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    // Start the generation process asynchronously
    videoGenerationService.startGeneration(requestId);
    
    res.status(202).json({ 
      requestId, 
      message: 'Video generation request accepted',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ error: 'Failed to process video generation request' });
  }
});

app.get('/api/video/status/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = videoGenerationService.getRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Video generation request not found' });
    }
    
    res.json(request);
  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({ error: 'Failed to get video status' });
  }
});

app.get('/api/video/list', (req, res) => {
  try {
    const videos = videoGenerationService.listRequests();
    res.json(videos);
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// Google Drive API endpoints
app.post('/api/drive/auth', (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Exchange auth code for tokens
    googleDriveService.authenticate(authCode)
      .then(tokens => {
        res.json({ success: true, message: 'Authentication successful' });
      })
      .catch(error => {
        console.error('Google Drive authentication error:', error);
        res.status(401).json({ error: 'Authentication failed' });
      });
  } catch (error) {
    console.error('Error in Drive auth:', error);
    res.status(500).json({ error: 'Failed to process authentication' });
  }
});

app.get('/api/drive/auth-url', (req, res) => {
  try {
    const authUrl = googleDriveService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

app.get('/api/drive/files', (req, res) => {
  try {
    googleDriveService.listFiles()
      .then(files => {
        res.json(files);
      })
      .catch(error => {
        console.error('Error listing Drive files:', error);
        res.status(401).json({ error: 'Failed to list files, authentication may be required' });
      });
  } catch (error) {
    console.error('Error in Drive files list:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.post('/api/drive/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileName = req.body.fileName || req.file.originalname;
    
    googleDriveService.uploadFile(filePath, fileName)
      .then(fileId => {
        res.json({ 
          success: true, 
          fileId,
          message: 'File uploaded successfully to Google Drive' 
        });
      })
      .catch(error => {
        console.error('Error uploading to Drive:', error);
        res.status(500).json({ error: 'Failed to upload file to Google Drive' });
      });
  } catch (error) {
    console.error('Error in Drive upload:', error);
    res.status(500).json({ error: 'Failed to process file upload' });
  }
});

// Integration endpoint - upload generated video to Drive
app.post('/api/video/:requestId/upload-to-drive', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = videoGenerationService.getRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Video generation request not found' });
    }
    
    if (request.status !== 'completed') {
      return res.status(400).json({ error: 'Video generation not yet completed' });
    }
    
    if (!request.outputPath) {
      return res.status(400).json({ error: 'Video output path not found' });
    }
    
    googleDriveService.uploadFile(request.outputPath, `${request.title}.mp4`)
      .then(fileId => {
        // Update the request with Drive file ID
        videoGenerationService.updateRequest(requestId, {
          driveFileId: fileId,
          driveUploadedAt: new Date().toISOString()
        });
        
        res.json({ 
          success: true, 
          fileId,
          message: 'Video uploaded successfully to Google Drive' 
        });
      })
      .catch(error => {
        console.error('Error uploading video to Drive:', error);
        res.status(500).json({ error: 'Failed to upload video to Google Drive' });
      });
  } catch (error) {
    console.error('Error in video upload to Drive:', error);
    res.status(500).json({ error: 'Failed to process video upload to Drive' });
  }
});

// Catch all routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server with proper error handling
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle termination signals properly
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
