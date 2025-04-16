/**
 * Enhanced Advanced Video Routes for VideoEngine
 * Includes improved error handling and fallbacks for API endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Attempt to load services with robust error handling
let advancedVideoService;
let googleDriveService;

try {
  advancedVideoService = require('./advancedVideoGenerationService');
  console.log('Successfully loaded advancedVideoGenerationService');
} catch (error) {
  console.error('Error loading advancedVideoGenerationService:', error);
  // Create mock service with basic functionality
  advancedVideoService = {
    parseScriptIntoSegments: (script, duration) => {
      return script.split('.').filter(s => s.trim()).map(s => s.trim() + '.');
    },
    generateVideoFromScript: async (script, options) => {
      const id = 'mock-' + uuidv4();
      return {
        id,
        status: 'processing',
        progress: 0,
        message: 'Mock video generation started',
        script,
        options: { ...options, aspectRatio: '16:9' }
      };
    },
    getVideoRequestStatus: (id) => {
      return {
        id,
        status: 'processing',
        progress: 50,
        message: 'Mock video processing'
      };
    },
    getAllVideoRequests: () => []
  };
}

try {
  googleDriveService = require('./googleDriveService');
  console.log('Successfully loaded googleDriveService');
} catch (error) {
  console.error('Error loading googleDriveService:', error);
  // Create mock service with basic functionality
  googleDriveService = {
    getAuthUrl: (userId) => `https://accounts.google.com/o/oauth2/auth?userId=${userId}`,
    handleAuthCallback: async (code, userId) => ({ success: true, userId }),
    uploadFile: async (fileData, userId) => ({
      id: 'mock-' + uuidv4(),
      name: fileData.name,
      webViewLink: 'https://drive.google.com/mock',
      webContentLink: 'https://drive.google.com/mock/download'
    }),
    createDirectDownloadLink: async (fileId) => `https://drive.google.com/uc?export=download&id=${fileId}`,
    listFiles: async () => [],
    uploadVideoAndCreateDownloadLink: async (videoUrl, videoName) => ({
      id: 'mock-' + uuidv4(),
      name: videoName,
      directDownloadUrl: 'https://drive.google.com/mock/direct-download'
    })
  };
}

// Configure multer for file uploads with error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept all files but log the type
    console.log(`Uploading file: ${file.originalname}, type: ${file.mimetype}`);
    cb(null, true);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'advanced-video',
    videoService: !!advancedVideoService,
    driveService: !!googleDriveService,
    timestamp: new Date().toISOString()
  });
});

/**
 * Generate video from script
 * POST /api/advanced-video/generate
 */
router.post('/generate', async (req, res) => {
  console.log('Received video generation request');
  
  try {
    const { script, options = {} } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }
    
    // Log the request details
    console.log(`Generate request - Script length: ${script.length}, Options:`, options);
    
    // Ensure 16:9 aspect ratio is set in options
    const enhancedOptions = {
      ...options,
      aspectRatio: '16:9',
      resolution: options.resolution || '1920x1080'
    };
    
    // Generate video
    const result = await advancedVideoService.generateVideoFromScript(script, enhancedOptions);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ 
      error: 'Failed to generate video', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get video generation status
 * GET /api/advanced-video/status/:id
 */
router.get('/status/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Get status
    const status = advancedVideoService.getVideoRequestStatus(id);
    
    if (!status) {
      return res.status(404).json({ error: 'Video request not found' });
    }
    
    // Return status
    res.json(status);
  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({ 
      error: 'Failed to get video status', 
      message: error.message 
    });
  }
});

/**
 * List all video generation requests
 * GET /api/advanced-video/list
 */
router.get('/list', (req, res) => {
  try {
    // Get all video requests
    const videos = advancedVideoService.getAllVideoRequests();
    
    // Return videos
    res.json({ videos });
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ 
      error: 'Failed to list videos', 
      message: error.message 
    });
  }
});

/**
 * Upload video to Google Drive
 * POST /api/advanced-video/upload-to-drive
 */
router.post('/upload-to-drive', upload.single('video'), async (req, res) => {
  try {
    const { userId = 'default' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }
    
    // Upload to Google Drive
    const result = await googleDriveService.uploadFile({
      name: req.file.originalname,
      mimeType: req.file.mimetype,
      filePath: req.file.path
    }, userId);
    
    // Create direct download link
    const directDownloadUrl = await googleDriveService.createDirectDownloadLink(result.id, userId);
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);
    
    // Return result
    res.json({
      ...result,
      directDownloadUrl
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    
    // Clean up temp file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload to Google Drive', 
      message: error.message 
    });
  }
});

/**
 * Get Google Drive authentication URL
 * GET /api/advanced-video/drive-auth
 */
router.get('/drive-auth', (req, res) => {
  try {
    const userId = req.query.userId || `user-${Date.now()}`;
    
    // Get auth URL
    const authUrl = googleDriveService.getAuthUrl(userId);
    
    // Return auth URL
    res.json({ authUrl, userId });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to get auth URL', 
      message: error.message 
    });
  }
});

/**
 * Handle Google Drive authentication callback
 * GET /api/advanced-video/drive-callback
 */
router.get('/drive-callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Handle callback
    const result = await googleDriveService.handleAuthCallback(code, userId);
    
    // Redirect to app with success parameter
    res.redirect(`/?auth=success&userId=${userId}`);
  } catch (error) {
    console.error('Error handling auth callback:', error);
    res.redirect(`/?auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * List files from Google Drive
 * GET /api/advanced-video/drive-files
 */
router.get('/drive-files', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    
    // List files
    const files = await googleDriveService.listFiles(userId);
    
    // Return files
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files', 
      message: error.message 
    });
  }
});

/**
 * Create direct download link for Google Drive file
 * GET /api/advanced-video/drive-download/:fileId
 */
router.get('/drive-download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId = 'default' } = req.query;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    // Create direct download link
    const downloadUrl = await googleDriveService.createDirectDownloadLink(fileId, userId);
    
    // Return download URL
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Error creating direct download link:', error);
    res.status(500).json({ 
      error: 'Failed to create direct download link', 
      message: error.message 
    });
  }
});

// Export router
module.exports = router;
