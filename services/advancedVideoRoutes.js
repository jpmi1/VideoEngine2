/**
 * API routes for the advanced video generation service
 * Implements Test-Time Training approach for consistent clip generation
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AdvancedVideoGenerator = require('../services/advancedVideoGenerationService');

// Configure multer for script file uploads
const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize the advanced video generator
const videoGenerator = new AdvancedVideoGenerator({
  debug: process.env.NODE_ENV !== 'production',
  apiKey: process.env.GEMINI_API_KEY,
  tempFolder: path.join(process.cwd(), 'uploads/temp'),
  outputFolder: path.join(process.cwd(), 'uploads/videos')
});

// Initialize the generator when the server starts
(async () => {
  try {
    await videoGenerator.initialize();
    console.log('Advanced Video Generator initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Advanced Video Generator:', error);
  }
})();

/**
 * Generate a video from a script with consistent clips
 * POST /api/advanced-video/generate
 */
router.post('/generate', upload.single('scriptFile'), async (req, res) => {
  try {
    // Get script from either file upload or request body
    let script = req.body.script;
    
    if (req.file) {
      const fileContent = await fs.readFile(req.file.path, 'utf8');
      script = fileContent;
      // Clean up uploaded file
      await fs.unlink(req.file.path);
    }
    
    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }
    
    // Get other parameters from request body
    const style = req.body.style || 'cinematic';
    const characters = req.body.characters ? 
      (Array.isArray(req.body.characters) ? req.body.characters : [req.body.characters]) : 
      ['character'];
    const outputName = req.body.outputName || `video_${Date.now()}`;
    
    // Create a request ID for tracking
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    // Store request in database (simulated here)
    const videoRequest = {
      id: requestId,
      title: req.body.title || outputName,
      description: req.body.description || 'Generated from script',
      script,
      style,
      characters,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Start generation process asynchronously
    processVideoGeneration(videoRequest).catch(error => {
      console.error(`Error processing video generation for request ${requestId}:`, error);
      // Update request status to failed (would be in database in real implementation)
      videoRequest.status = 'failed';
      videoRequest.error = error.message;
    });
    
    // Return request ID immediately
    res.status(202).json({
      requestId,
      message: 'Video generation started',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error starting video generation:', error);
    res.status(500).json({ error: 'Failed to start video generation' });
  }
});

/**
 * Get status of a video generation request
 * GET /api/advanced-video/status/:requestId
 */
router.get('/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // In a real implementation, this would fetch from a database
    // For this example, we'll simulate a response
    
    // Simulate different statuses based on request ID
    const lastChar = requestId.charAt(requestId.length - 1);
    let status;
    
    if (['0', '1'].includes(lastChar)) {
      status = 'pending';
    } else if (['2', '3', '4'].includes(lastChar)) {
      status = 'processing';
    } else if (['5', '6', '7', '8'].includes(lastChar)) {
      status = 'completed';
    } else {
      status = 'failed';
    }
    
    // Simulate a response
    const response = {
      id: requestId,
      title: `Video ${requestId}`,
      description: 'Generated from script',
      status,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      style: 'cinematic',
      duration: 60
    };
    
    if (status === 'completed') {
      response.completedAt = new Date().toISOString();
      response.outputUrl = `/api/advanced-video/download/${requestId}`;
    } else if (status === 'failed') {
      response.error = 'Video generation failed';
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error getting video status:', error);
    res.status(500).json({ error: 'Failed to get video status' });
  }
});

/**
 * List all video generation requests
 * GET /api/advanced-video/list
 */
router.get('/list', async (req, res) => {
  try {
    // In a real implementation, this would fetch from a database
    // For this example, we'll simulate a response with some sample videos
    
    const videos = [];
    
    // Generate 5 sample videos with different statuses
    const statuses = ['pending', 'processing', 'completed', 'completed', 'failed'];
    
    for (let i = 0; i < 5; i++) {
      const requestId = Date.now().toString(36) + i;
      const status = statuses[i];
      
      const video = {
        id: requestId,
        title: `Sample Video ${i + 1}`,
        description: `This is a sample video ${i + 1} with status "${status}"`,
        status,
        createdAt: new Date(Date.now() - (i * 3600000)).toISOString(),
        style: i % 2 === 0 ? 'cinematic' : 'documentary',
        duration: 60
      };
      
      if (status === 'completed') {
        video.completedAt = new Date(Date.now() - (i * 1800000)).toISOString();
        video.outputUrl = `/api/advanced-video/download/${requestId}`;
      } else if (status === 'failed') {
        video.error = 'Video generation failed';
      }
      
      videos.push(video);
    }
    
    res.json(videos);
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

/**
 * Download a generated video
 * GET /api/advanced-video/download/:requestId
 */
router.get('/download/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // In a real implementation, this would fetch the video file path from a database
    // For this example, we'll return a placeholder message
    
    res.send(`This would be the download for video ${requestId}`);
    
    // In a real implementation, it would be something like:
    // const videoPath = path.join(videoGenerator.config.outputFolder, `${requestId}.mp4`);
    // res.download(videoPath);
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

/**
 * Process video generation asynchronously
 * @param {Object} videoRequest - Video generation request
 */
async function processVideoGeneration(videoRequest) {
  try {
    // Update request status to processing
    videoRequest.status = 'processing';
    
    // Generate the video
    const outputPath = await videoGenerator.generateVideo({
      script: videoRequest.script,
      style: videoRequest.style,
      characters: videoRequest.characters,
      outputName: videoRequest.id
    });
    
    // Update request status to completed
    videoRequest.status = 'completed';
    videoRequest.completedAt = new Date().toISOString();
    videoRequest.outputUrl = `/api/advanced-video/download/${videoRequest.id}`;
    
    console.log(`Video generation completed for request ${videoRequest.id}`);
    return outputPath;
  } catch (error) {
    console.error(`Error generating video for request ${videoRequest.id}:`, error);
    
    // Update request status to failed
    videoRequest.status = 'failed';
    videoRequest.error = error.message;
    
    throw error;
  }
}

module.exports = router;
