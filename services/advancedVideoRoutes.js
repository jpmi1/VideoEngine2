const express = require('express');
const router = express.Router();
const { generateVideoWithFallback, checkVideoStatus } = require('./klingAiService');
const { uploadToGoogleDrive, createDirectDownloadLink } = require('./googleDriveService');

/**
 * Generate a video using Kling AI
 * POST /api/advanced-video/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Missing required parameter: prompt' 
      });
    }
    
    // Ensure 16:9 aspect ratio
    const enhancedOptions = {
      ...options,
      aspectRatio: '16:9',
      enhancePrompt: true
    };
    
    // Generate video using Kling AI
    const result = await generateVideoWithFallback(prompt, enhancedOptions);
    
    // Return task information
    res.json({
      id: result.taskId || `task_${Date.now()}`,
      status: result.status,
      message: result.message,
      prompt: prompt,
      options: enhancedOptions,
      keywords: result.keywords || []
    });
  } catch (error) {
    console.error('Error generating video:', error);
    res.status(500).json({ 
      error: `Failed to generate video: ${error.message}` 
    });
  }
});

/**
 * Check the status of a video generation task
 * GET /api/advanced-video/status/:taskId
 */
router.get('/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: taskId' 
      });
    }
    
    // Check task status
    const result = await checkVideoStatus(taskId);
    
    // Return status information
    res.json({
      id: taskId,
      status: result.status,
      message: result.message,
      videoUrl: result.videoUrl || null,
      videoDuration: result.videoDuration || null
    });
  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({ 
      error: `Failed to check video status: ${error.message}` 
    });
  }
});

/**
 * Upload a video to Google Drive
 * POST /api/advanced-video/upload-to-drive
 */
router.post('/upload-to-drive', async (req, res) => {
  try {
    const { videoUrl, fileName } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ 
        error: 'Missing required parameter: videoUrl' 
      });
    }
    
    // Generate a file name if not provided
    const defaultFileName = `video_${Date.now()}.mp4`;
    const videoFileName = fileName || defaultFileName;
    
    // Upload video to Google Drive
    const uploadResult = await uploadToGoogleDrive(videoUrl, videoFileName);
    
    // Create direct download link
    const downloadLink = await createDirectDownloadLink(uploadResult.fileId);
    
    // Return upload information
    res.json({
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      googleDriveUrl: uploadResult.webViewLink,
      googleDriveDownloadUrl: downloadLink,
      message: 'Video uploaded to Google Drive successfully'
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    res.status(500).json({ 
      error: `Failed to upload to Google Drive: ${error.message}` 
    });
  }
});

/**
 * Get a direct download link for a Google Drive file
 * GET /api/advanced-video/drive-download/:fileId
 */
router.get('/drive-download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: fileId' 
      });
    }
    
    // Create direct download link
    const downloadLink = await createDirectDownloadLink(fileId);
    
    // Return download link
    res.json({
      fileId: fileId,
      downloadUrl: downloadLink,
      message: 'Direct download link created successfully'
    });
  } catch (error) {
    console.error('Error creating download link:', error);
    res.status(500).json({ 
      error: `Failed to create download link: ${error.message}` 
    });
  }
});

/**
 * Health check endpoint
 * GET /api/advanced-video/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Advanced video service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
