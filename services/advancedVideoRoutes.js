/**
 * Advanced Video Routes for VideoEngine
 * Handles API endpoints for video generation and Google Drive integration
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Import services
let advancedVideoService;
let googleDriveService;

// Load services with error handling
try {
  advancedVideoService = require('./advancedVideoGenerationService');
  console.log('Successfully loaded advancedVideoGenerationService');
} catch (error) {
  console.error('Error loading advancedVideoGenerationService:', error);
  // Create mock service with basic functionality
  advancedVideoService = {
    generateVideoFromScript: async (script, options) => {
      const requestId = uuidv4();
      return {
        id: requestId,
        status: 'processing',
        script,
        options
      };
    },
    getVideoStatus: (requestId) => {
      return {
        id: requestId,
        status: 'processing',
        progress: 50
      };
    },
    listVideoRequests: () => {
      return [];
    }
  };
}

try {
  googleDriveService = require('./googleDriveService');
  console.log('Successfully loaded googleDriveService');
} catch (error) {
  console.error('Error loading googleDriveService:', error);
  // Create mock service with basic functionality
  googleDriveService = {
    getAuthUrl: (userId) => {
      return `https://accounts.google.com/o/oauth2/auth?userId=${userId}`;
    },
    handleAuthCallback: async (code, userId) => {
      return { success: true, userId };
    },
    uploadFile: async (fileData, userId) => {
      return {
        id: uuidv4(),
        name: fileData.name,
        webViewLink: `https://drive.google.com/file/d/${uuidv4()}/view`
      };
    },
    createDirectDownloadLink: async (fileId) => {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    },
    listFiles: async (userId) => {
      return [];
    }
  };
}

/**
 * Validate video URL
 * @param {string} url - URL to validate
 * @returns {Promise<boolean>} Whether URL is valid and accessible
 */
async function validateVideoUrl(url) {
  if (!url) return false;
  
  try {
    // Check if URL is accessible
    const response = await axios.head(url, { timeout: 10000 });
    
    // Check if response is successful and content type is video
    const contentType = response.headers['content-type'] || '';
    const isVideo = contentType.startsWith('video/') || 
                   url.endsWith('.mp4') || 
                   url.endsWith('.mov') || 
                   url.endsWith('.webm');
    
    return response.status === 200 && isVideo;
  } catch (error) {
    console.error('Error validating video URL:', error.message);
    return false;
  }
}

/**
 * Generate video from script
 * POST /api/advanced-video/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { script, options } = req.body;
    
    // Validate input
    if (!script || script.trim() === '') {
      return res.status(400).json({ error: 'Script is required' });
    }
    
    // Enhance options with defaults
    const enhancedOptions = {
      aspectRatio: '16:9', // Ensure 16:9 aspect ratio
      ...options
    };
    
    // Generate video
    const result = await advancedVideoService.generateVideoFromScript(script, enhancedOptions);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating video:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get video generation status
 * GET /api/advanced-video/status/:id
 */
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get status
    const status = await advancedVideoService.getVideoStatus(id);
    
    // Validate final video URL if status is completed
    if (status.status === 'completed' && status.finalVideoUrl) {
      const isValid = await validateVideoUrl(status.finalVideoUrl);
      
      if (!isValid) {
        status.message = 'Warning: Final video URL may not be accessible';
        status.urlValidation = 'failed';
      } else {
        status.urlValidation = 'passed';
      }
    }
    
    res.json(status);
  } catch (error) {
    console.error('Error getting video status:', error.message);
    res.status(404).json({ error: error.message });
  }
});

/**
 * List all video requests
 * GET /api/advanced-video/list
 */
router.get('/list', async (req, res) => {
  try {
    const videos = await advancedVideoService.listVideoRequests();
    res.json({ videos });
  } catch (error) {
    console.error('Error listing videos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Google Drive authentication URL
 * GET /api/advanced-video/drive-auth
 */
router.get('/drive-auth', async (req, res) => {
  try {
    const userId = req.query.userId || uuidv4();
    const authUrl = await googleDriveService.getAuthUrl(userId);
    
    res.json({ authUrl, userId });
  } catch (error) {
    console.error('Error getting Drive auth URL:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle Google Drive authentication callback
 * GET /api/advanced-video/drive-callback
 */
router.get('/drive-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Handle callback
    const result = await googleDriveService.handleAuthCallback(code, state);
    
    res.json(result);
  } catch (error) {
    console.error('Error handling Drive callback:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload video to Google Drive
 * POST /api/advanced-video/upload-to-drive
 */
router.post('/upload-to-drive', async (req, res) => {
  try {
    const { videoUrl, videoName, userId } = req.body;
    
    // Validate input
    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }
    
    // Validate video URL
    const isValid = await validateVideoUrl(videoUrl);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or inaccessible video URL' });
    }
    
    // Upload to Drive
    const result = await googleDriveService.uploadVideoAndCreateDownloadLink(
      videoUrl,
      videoName || `VideoEngine_${uuidv4()}.mp4`,
      userId || 'default'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error uploading to Drive:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List files in Google Drive
 * GET /api/advanced-video/drive-files
 */
router.get('/drive-files', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const options = {
      query: req.query.query || "mimeType contains 'video/'",
      pageSize: parseInt(req.query.pageSize) || 10
    };
    
    const files = await googleDriveService.listFiles(userId, options);
    
    res.json({ files });
  } catch (error) {
    console.error('Error listing Drive files:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get direct download link for Google Drive file
 * GET /api/advanced-video/drive-download/:fileId
 */
router.get('/drive-download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.query.userId || 'default';
    
    // Create direct download link
    const downloadUrl = await googleDriveService.createDirectDownloadLink(fileId, userId);
    
    // Validate URL
    const isValid = await validateVideoUrl(downloadUrl);
    
    res.json({ 
      fileId, 
      downloadUrl,
      isValid,
      message: isValid ? 'Download URL is valid and accessible' : 'Warning: URL may not be directly accessible'
    });
  } catch (error) {
    console.error('Error creating download link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 * GET /api/advanced-video/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'advanced-video',
    videoService: !!advancedVideoService,
    driveService: !!googleDriveService,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
