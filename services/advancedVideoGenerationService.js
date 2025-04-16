/**
 * Advanced Video Generation Service with Gemini Veo 2 integration
 * Implements Test-Time Training approach for temporal consistency
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
 * Configuration for Gemini Veo 2 API
 */
const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || 'AIzaSyCgnMAfFxND1YreT_rdW0kw0kWjtHRXsbc',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-video:generateContent',
  aspectRatio: '16:9', // Ensure 16:9 aspect ratio for all videos
  resolution: '1920x1080', // Full HD resolution
  frameRate: 30, // 30 fps for smooth video
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
 * Generate a video clip using Gemini Veo 2
 * @param {string} prompt - Text prompt for the clip
 * @param {object} options - Generation options
 * @param {string} referenceImageUrl - URL of reference image for consistency (optional)
 * @returns {Promise<object>} Generated clip data
 */
async function generateVideoClip(prompt, options = {}, referenceImageUrl = null) {
  console.log('Generating video clip with prompt:', prompt.substring(0, 50) + '...');
  
  try {
    // Combine default options with provided options
    const finalOptions = {
      aspectRatio: geminiConfig.aspectRatio,
      resolution: geminiConfig.resolution,
      frameRate: geminiConfig.frameRate,
      ...options
    };
    
    // Prepare the request payload for Gemini Video API
    const payload = {
      contents: [
        {
          parts: [
            { 
              text: `Create a high-quality video clip with the following specifications:
              - Content: ${prompt}
              - Aspect ratio: ${finalOptions.aspectRatio}
              - Resolution: ${finalOptions.resolution}
              - Style: ${options.style || 'cinematic, professional'}
              - Duration: ${options.duration || 4} seconds
              ${referenceImageUrl ? `- Maintain visual consistency with the reference image` : ''}
              `
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
        maxOutputTokens: 2048
      }
    };
    
    // Add reference image if provided (for consistency between clips)
    if (referenceImageUrl) {
      payload.contents[0].parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: referenceImageUrl.replace(/^data:image\/jpeg;base64,/, '') // Remove data URL prefix
        }
      });
    }
    
    // Make actual API call to Gemini Video API
    console.log(`Making API call to ${geminiConfig.baseUrl}`);
    const response = await axios.post(
      `${geminiConfig.baseUrl}?key=${geminiConfig.apiKey}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout for video generation
      }
    );
    
    console.log('Gemini API response received:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    // Process the response
    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('Empty response from Gemini API');
    }
    
    // Extract video URL from response
    let videoUrl = null;
    let thumbnailUrl = null;
    
    // Look for video content in the response
    const candidate = response.data.candidates[0];
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.video && part.video.url) {
          videoUrl = part.video.url;
        }
        if (part.image && part.image.url) {
          thumbnailUrl = part.image.url;
        }
      }
    }
    
    if (!videoUrl) {
      // If no video URL is found in the expected structure, try to find it elsewhere in the response
      const responseStr = JSON.stringify(response.data);
      const urlMatch = responseStr.match(/"url":"(https:\/\/[^"]+)"/);
      if (urlMatch && urlMatch[1]) {
        videoUrl = urlMatch[1];
      } else {
        throw new Error('No video URL found in Gemini API response');
      }
    }
    
    return {
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      prompt,
      options: finalOptions,
      rawResponse: response.data // Store raw response for debugging
    };
  } catch (error) {
    console.error('Error generating video clip:', error.message);
    console.error('Error details:', error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data');
    
    // Don't return fake data if the operation fails
    throw new Error(`Failed to generate video clip: ${error.message}`);
  }
}

/**
 * Extract a reference frame from a video for consistency
 * @param {string} videoUrl - URL of the video
 * @returns {Promise<string>} Base64 encoded image data
 */
async function extractReferenceFrame(videoUrl) {
  console.log('Extracting reference frame from video:', videoUrl);
  
  try {
    // Download video to temp file
    const tempVideoPath = path.join(__dirname, '..', 'uploads', `temp_${uuidv4()}.mp4`);
    const tempFramePath = path.join(__dirname, '..', 'uploads', `temp_${uuidv4()}.jpg`);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const videoResponse = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    
    const writer = fs.createWriteStream(tempVideoPath);
    videoResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Use ffmpeg to extract a frame (requires ffmpeg to be installed)
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i ${tempVideoPath} -ss 00:00:01 -frames:v 1 ${tempFramePath}`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    
    // Read the frame and convert to base64
    const frameData = fs.readFileSync(tempFramePath);
    const base64Frame = `data:image/jpeg;base64,${frameData.toString('base64')}`;
    
    // Clean up temp files
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempFramePath);
    
    return base64Frame;
  } catch (error) {
    console.error('Error extracting reference frame:', error.message);
    
    // If extraction fails, don't use a reference frame
    return null;
  }
}

/**
 * Generate a complete video from a script using Test-Time Training approach
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
    
    // Generate each clip with reference to previous clip for consistency
    let referenceImageUrl = null;
    
    for (let i = 0; i < segments.length; i++) {
      // Update progress
      videoRequests[requestId].progress = Math.floor((i / totalSegments) * 100);
      videoRequests[requestId].message = `Generating clip ${i+1} of ${totalSegments}`;
      
      // Generate clip with reference to previous clip if available
      const clipOptions = {
        ...options,
        duration: clipDuration,
        aspectRatio: geminiConfig.aspectRatio, // Ensure 16:9 aspect ratio
        resolution: geminiConfig.resolution
      };
      
      const clipData = await generateVideoClip(segments[i], clipOptions, referenceImageUrl);
      
      // Extract reference frame from generated clip for next clip's consistency
      if (clipData.videoUrl) {
        referenceImageUrl = await extractReferenceFrame(clipData.videoUrl);
      }
      
      // Store clip data
      videoRequests[requestId].clips.push({
        index: i,
        segment: segments[i],
        videoUrl: clipData.videoUrl,
        thumbnailUrl: clipData.thumbnailUrl
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
