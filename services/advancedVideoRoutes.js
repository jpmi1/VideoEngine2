/**
 * Advanced Video Routes for VideoEngine
 * Handles API endpoints for video generation with 16:9 aspect ratio
 * and Google Drive direct download links
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const advancedVideoService = require('./advancedVideoGenerationService');
const googleDriveService = require('./googleDriveService');

// Configure multer for file uploads
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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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
    
    // Ensure 16:9 aspect ratio is set in options
    const enhancedOptions = {
      ...options,
      aspectRatio: '16:9',
      resolution: '1920x1080'
    };
    
    // Start video generation process
    const result = await advancedVideoService.generateVideoFromScript(script, enhancedOptions);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error generating video:', error.message);
    res.status(500).json({ error: 'Failed to generate video', message: error.message });
  }
});

/**
 * Get video generation status
 * GET /api/advanced-video/status/:id
 */
router.get('/status/:id', async (req, res) => {
  console.log('Received video status request for ID:', req.params.id);
  
  try {
    const result = await advancedVideoService.getVideoRequestStatus(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting video status:', error.message);
    res.status(404).json({ error: 'Video request not found', message: error.message });
  }
});

/**
 * List all video generation requests
 * GET /api/advanced-video/list
 */
router.get('/list', async (req, res) => {
  console.log('Received request to list all videos');
  
  try {
    const result = await advancedVideoService.getAllVideoRequests();
    res.status(200).json({ videos: result, message: 'Test route working correctly' });
  } catch (error) {
    console.error('Error listing videos:', error.message);
    res.status(500).json({ error: 'Failed to list videos', message: error.message });
  }
});

/**
 * Upload video to Google Drive and get direct download link
 * POST /api/advanced-video/upload-to-drive
 */
router.post('/upload-to-drive', upload.single('video'), async (req, res) => {
  console.log('Received request to upload video to Google Drive');
  
  try {
    if (!req.file && !req.body.videoUrl) {
      return res.status(400).json({ error: 'Video file or URL is required' });
    }
    
    const videoName = req.body.name || `VideoEngine_${Date.now()}.mp4`;
    const userId = req.body.userId || 'default';
    
    let uploadResult;
    
    if (req.file) {
      // Upload from local file
      uploadResult = await googleDriveService.uploadFile({
        name: videoName,
        mimeType: 'video/mp4',
        filePath: req.file.path
      }, userId);
      
      // Create direct download link
      const directDownloadUrl = await googleDriveService.createDirectDownloadLink(uploadResult.id, userId);
      uploadResult.directDownloadUrl = directDownloadUrl;
      
      // Clean up local file
      fs.unlinkSync(req.file.path);
    } else {
      // Upload from URL
      uploadResult = await googleDriveService.uploadVideoAndCreateDownloadLink(
        req.body.videoUrl,
        videoName,
        userId
      );
    }
    
    res.status(200).json({
      success: true,
      file: uploadResult,
      message: 'Video uploaded to Google Drive successfully'
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error.message);
    res.status(500).json({ error: 'Failed to upload to Google Drive', message: error.message });
  }
});

/**
 * Get Google Drive authentication URL
 * GET /api/advanced-video/drive-auth
 */
router.get('/drive-auth', (req, res) => {
  console.log('Received request for Google Drive auth URL');
  
  try {
    const userId = req.query.userId || uuidv4();
    const authUrl = googleDriveService.getAuthUrl(userId);
    
    res.status(200).json({
      success: true,
      userId,
      authUrl,
      message: 'Authentication URL generated successfully'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error.message);
    res.status(500).json({ error: 'Failed to generate auth URL', message: error.message });
  }
});

/**
 * Handle Google Drive authentication callback
 * GET /api/advanced-video/drive-callback
 */
router.get('/drive-callback', async (req, res) => {
  console.log('Received Google Drive auth callback');
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const userId = state || 'default';
    const result = await googleDriveService.handleAuthCallback(code, userId);
    
    // Redirect to frontend with success message
    res.redirect(`/?auth=success&userId=${userId}`);
  } catch (error) {
    console.error('Error handling auth callback:', error.message);
    res.status(500).json({ error: 'Failed to handle auth callback', message: error.message });
  }
});

/**
 * List files from Google Drive
 * GET /api/advanced-video/drive-files
 */
router.get('/drive-files', async (req, res) => {
  console.log('Received request to list Google Drive files');
  
  try {
    const userId = req.query.userId || 'default';
    const options = {
      query: req.query.query || "mimeType contains 'video/'",
      pageSize: parseInt(req.query.pageSize) || 10,
      orderBy: req.query.orderBy || 'createdTime desc'
    };
    
    const files = await googleDriveService.listFiles(userId, options);
    
    res.status(200).json({
      success: true,
      files,
      message: 'Files listed successfully'
    });
  } catch (error) {
    console.error('Error listing files:', error.message);
    res.status(500).json({ error: 'Failed to list files', message: error.message });
  }
});

/**
 * Create direct download link for Google Drive file
 * GET /api/advanced-video/drive-download/:fileId
 */
router.get('/drive-download/:fileId', async (req, res) => {
  console.log('Received request to create direct download link for file:', req.params.fileId);
  
  try {
    const userId = req.query.userId || 'default';
    const downloadUrl = await googleDriveService.createDirectDownloadLink(req.params.fileId, userId);
    
    res.status(200).json({
      success: true,
      fileId: req.params.fileId,
      downloadUrl,
      message: 'Direct download link created successfully'
    });
  } catch (error) {
    console.error('Error creating direct download link:', error.message);
    res.status(500).json({ error: 'Failed to create direct download link', message: error.message });
  }
});

module.exports = router;
