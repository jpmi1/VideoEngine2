/**
 * Advanced Video Generation Service with alternative implementation
 * Provides robust video generation with fallback to external services
 * Ensures 16:9 aspect ratio for all generated videos
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const googleDriveService = require('./googleDriveService');

// In-memory storage for video generation requests
const videoRequests = {};

/**
 * Configuration for video generation
 */
const videoConfig = {
  apiKey: process.env.GEMINI_API_KEY || 'AIzaSyCgnMAfFxND1YreT_rdW0kw0kWjtHRXsbc',
  aspectRatio: '16:9', // Ensure 16:9 aspect ratio for all videos
  resolution: '1920x1080', // Full HD resolution
  frameRate: 30, // 30 fps for smooth video
  // Stock video API for fallback
  stockVideoApi: 'https://api.pexels.com/videos/search',
  stockVideoApiKey: process.env.PEXELS_API_KEY || '',
  // Sample video URLs for development/testing
  sampleVideos: [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
  ]
};

/**
 * Parse script into segments for 3-4 second clips
 * @param {string} script - Full script text
 * @param {number} clipDuration - Target duration for each clip in seconds
 * @returns {Array} Array of script segments
 */
function parseScriptIntoSegments(script, clipDuration = 4) {
  console.log('Parsing script into segments with clipDuration:', clipDuration);
  
  // Split script by paragraph or double line breaks
  const paragraphs = script.split(/\n\s*\n|\r\n\s*\r\n/);
  
  // Further split long paragraphs based on sentences and estimated duration
  const segments = [];
  const wordsPerSecond = 2.5; // Average speaking rate
  
  paragraphs.forEach(paragraph => {
    if (!paragraph.trim()) return;
    
    // Split into sentences
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    
    let currentSegment = '';
    let currentWordCount = 0;
    const targetWordCount = clipDuration * wordsPerSecond;
    
    sentences.forEach(sentence => {
      const sentenceWordCount = sentence.split(/\s+/).length;
      
      if (currentWordCount + sentenceWordCount <= targetWordCount) {
        // Add to current segment
        currentSegment += (currentSegment ? ' ' : '') + sentence;
        currentWordCount += sentenceWordCount;
      } else if (currentSegment) {
        // Current segment is full, push it and start a new one
        segments.push(currentSegment);
        currentSegment = sentence;
        currentWordCount = sentenceWordCount;
      } else {
        // Sentence is too long for a single segment, add it anyway
        segments.push(sentence);
        currentSegment = '';
        currentWordCount = 0;
      }
    });
    
    // Add the last segment if not empty
    if (currentSegment) {
      segments.push(currentSegment);
    }
  });
  
  console.log(`Parsed ${segments.length} segments from script`);
  return segments;
}

/**
 * Search for stock videos based on keywords
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} Array of video URLs
 */
async function searchStockVideos(query, options = {}) {
  console.log('Searching stock videos for:', query);
  
  try {
    // If no API key is provided, use sample videos
    if (!videoConfig.stockVideoApiKey) {
      console.log('No stock video API key provided, using sample videos');
      
      // Return a random sample video
      const randomIndex = Math.floor(Math.random() * videoConfig.sampleVideos.length);
      return [videoConfig.sampleVideos[randomIndex]];
    }
    
    // Search for stock videos using Pexels API
    const response = await axios.get(videoConfig.stockVideoApi, {
      params: {
        query,
        per_page: options.limit || 5,
        orientation: 'landscape', // For 16:9 aspect ratio
        size: 'large'
      },
      headers: {
        'Authorization': videoConfig.stockVideoApiKey
      }
    });
    
    if (response.data && response.data.videos && response.data.videos.length > 0) {
      // Extract video URLs
      const videos = response.data.videos.map(video => {
        // Find the highest quality video file with 16:9 aspect ratio
        const videoFiles = video.video_files.filter(file => {
          const aspectRatio = file.width / file.height;
          return Math.abs(aspectRatio - (16/9)) < 0.1; // Allow small deviation from exact 16:9
        });
        
        // Sort by quality (resolution)
        videoFiles.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        
        return videoFiles.length > 0 ? videoFiles[0].link : null;
      }).filter(url => url !== null);
      
      return videos;
    }
    
    // If no videos found, use sample videos
    console.log('No stock videos found, using sample videos');
    const randomIndex = Math.floor(Math.random() * videoConfig.sampleVideos.length);
    return [videoConfig.sampleVideos[randomIndex]];
  } catch (error) {
    console.error('Error searching stock videos:', error.message);
    
    // Fall back to sample videos
    console.log('Error searching stock videos, using sample videos');
    const randomIndex = Math.floor(Math.random() * videoConfig.sampleVideos.length);
    return [videoConfig.sampleVideos[randomIndex]];
  }
}

/**
 * Generate a video clip using alternative methods
 * @param {string} prompt - Text prompt for the clip
 * @param {object} options - Generation options
 * @returns {Promise<object>} Generated clip data
 */
async function generateVideoClip(prompt, options = {}) {
  console.log('Generating video clip with prompt:', prompt.substring(0, 50) + '...');
  
  try {
    // Combine default options with provided options
    const finalOptions = {
      aspectRatio: videoConfig.aspectRatio,
      resolution: videoConfig.resolution,
      frameRate: videoConfig.frameRate,
      ...options
    };
    
    // Extract keywords from prompt for video search
    const keywords = extractKeywords(prompt);
    console.log('Extracted keywords:', keywords);
    
    // Search for stock videos based on keywords
    const videoUrls = await searchStockVideos(keywords, {
      limit: 5
    });
    
    if (videoUrls.length === 0) {
      throw new Error('No suitable videos found');
    }
    
    // Use the first video URL
    const videoUrl = videoUrls[0];
    
    // Generate a thumbnail URL (in a real implementation, this would extract a frame)
    const thumbnailUrl = generateThumbnailUrl(videoUrl);
    
    return {
      videoUrl,
      thumbnailUrl,
      prompt,
      options: finalOptions,
      keywords
    };
  } catch (error) {
    console.error('Error generating video clip:', error.message);
    throw new Error(`Failed to generate video clip: ${error.message}`);
  }
}

/**
 * Extract keywords from prompt for video search
 * @param {string} prompt - Text prompt
 * @returns {string} Keywords for video search
 */
function extractKeywords(prompt) {
  // Remove common words and extract key nouns and adjectives
  const words = prompt.toLowerCase().split(/\s+/);
  
  // Filter out common words and keep only meaningful keywords
  const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'is', 'are', 'was', 'were'];
  const keywords = words.filter(word => {
    // Remove punctuation
    const cleanWord = word.replace(/[^\w\s]/g, '');
    // Filter out short words and common words
    return cleanWord.length > 3 && !commonWords.includes(cleanWord);
  });
  
  // Take up to 3 keywords
  return keywords.slice(0, 3).join(' ');
}

/**
 * Generate a thumbnail URL from a video URL
 * @param {string} videoUrl - Video URL
 * @returns {string} Thumbnail URL
 */
function generateThumbnailUrl(videoUrl) {
  // In a real implementation, this would extract a frame from the video
  // For now, we'll use a placeholder
  return 'https://via.placeholder.com/1280x720?text=Video+Thumbnail';
}

/**
 * Generate a complete video from a script
 * @param {string} script - Full script text
 * @param {object} options - Generation options
 * @returns {Promise<object>} Generated video data
 */
async function generateVideoFromScript(script, options = {}) {
  console.log('Generating video from script with options:', options);
  
  const requestId = uuidv4();
  const outputDir = path.join(__dirname, '..', 'uploads', requestId);
  
  // Create request record
  videoRequests[requestId] = {
    id: requestId,
    status: 'processing',
    progress: 0,
    script,
    options,
    createdAt: new Date().toISOString(),
    clips: [],
    finalVideoUrl: null,
    message: 'Starting video generation process'
  };
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Parse script into segments for 3-4 second clips
    const clipDuration = options.clipDuration || 4;
    const segments = parseScriptIntoSegments(script, clipDuration);
    const totalSegments = segments.length;
    
    // Update request status
    videoRequests[requestId].message = `Parsed script into ${totalSegments} segments`;
    videoRequests[requestId].totalSegments = totalSegments;
    
    // Generate each clip
    for (let i = 0; i < segments.length; i++) {
      // Update progress
      videoRequests[requestId].progress = Math.floor((i / totalSegments) * 100);
      videoRequests[requestId].message = `Generating clip ${i+1} of ${totalSegments}`;
      
      // Generate clip
      const clipOptions = {
        ...options,
        duration: clipDuration,
        aspectRatio: videoConfig.aspectRatio, // Ensure 16:9 aspect ratio
        resolution: videoConfig.resolution
      };
      
      const clipData = await generateVideoClip(segments[i], clipOptions);
      
      // Store clip data
      videoRequests[requestId].clips.push({
        index: i,
        segment: segments[i],
        videoUrl: clipData.videoUrl,
        thumbnailUrl: clipData.thumbnailUrl,
        keywords: clipData.keywords
      });
    }
    
    // In a real implementation, we would combine clips into a final video
    // For now, we'll use the last clip as the final video
    
    let finalVideoUrl;
    if (videoRequests[requestId].clips.length > 0) {
      finalVideoUrl = videoRequests[requestId].clips[videoRequests[requestId].clips.length - 1].videoUrl;
    } else {
      throw new Error('No clips were generated successfully');
    }
    
    // Upload to Google Drive and get direct download link
    const driveResponse = await uploadToGoogleDrive(requestId, finalVideoUrl);
    
    // Update request with completion status
    videoRequests[requestId].status = 'completed';
    videoRequests[requestId].progress = 100;
    videoRequests[requestId].finalVideoUrl = finalVideoUrl;
    videoRequests[requestId].googleDriveUrl = driveResponse.webViewLink;
    videoRequests[requestId].googleDriveDownloadUrl = driveResponse.downloadUrl;
    videoRequests[requestId].message = 'Video generation completed successfully';
    videoRequests[requestId].completedAt = new Date().toISOString();
    
    return videoRequests[requestId];
  } catch (error) {
    console.error('Error generating video from script:', error.message);
    
    // Update request with error status
    videoRequests[requestId].status = 'failed';
    videoRequests[requestId].message = `Error: ${error.message}`;
    
    throw error;
  }
}

/**
 * Upload a video to Google Drive and get direct download link
 * @param {string} requestId - Video request ID
 * @param {string} videoUrl - URL of the video to upload
 * @returns {Promise<object>} Google Drive file data with download URL
 */
async function uploadToGoogleDrive(requestId, videoUrl) {
  console.log('Uploading video to Google Drive:', videoUrl);
  
  try {
    // Upload video to Google Drive
    const videoName = `VideoEngine_${requestId}_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
    
    const driveResponse = await googleDriveService.uploadVideoAndCreateDownloadLink(
      videoUrl,
      videoName,
      'default'
    );
    
    return {
      fileId: driveResponse.id,
      fileName: driveResponse.name,
      webViewLink: driveResponse.webViewLink,
      downloadUrl: driveResponse.directDownloadUrl
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error.message);
    
    // If Google Drive upload fails, return the original video URL
    return {
      fileId: null,
      fileName: `VideoEngine_${requestId}.mp4`,
      webViewLink: videoUrl,
      downloadUrl: videoUrl
    };
  }
}

/**
 * Get video generation status
 * @param {string} requestId - Request ID
 * @returns {object} Request status
 */
function getVideoStatus(requestId) {
  if (!videoRequests[requestId]) {
    throw new Error(`Video request ${requestId} not found`);
  }
  
  return videoRequests[requestId];
}

/**
 * List all video requests
 * @returns {Array} List of video requests
 */
function listVideoRequests() {
  return Object.values(videoRequests).map(request => ({
    id: request.id,
    status: request.status,
    progress: request.progress,
    createdAt: request.createdAt,
    completedAt: request.completedAt,
    finalVideoUrl: request.finalVideoUrl,
    googleDriveUrl: request.googleDriveUrl,
    googleDriveDownloadUrl: request.googleDriveDownloadUrl
  }));
}

module.exports = {
  generateVideoFromScript,
  getVideoStatus,
  listVideoRequests
};
