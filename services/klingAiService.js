const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { extractKeywords } = require('./keywordExtractor');

// Get Kling AI credentials from environment variables
const ACCESS_KEY_ID = process.env.KLING_API_KEY_ID || '';
const ACCESS_KEY_SECRET = process.env.KLING_API_KEY_SECRET || '';

// Kling AI API endpoint
const KLING_API_ENDPOINT = 'https://app.klingai.com/v1/videos/text2video';

/**
 * Generate authentication token for Kling AI API
 * @returns {string} Authentication token
 */
function generateAuthToken() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create signature string
  const signatureString = `${ACCESS_KEY_ID}${timestamp}${nonce}`;
  
  // Create HMAC-SHA256 signature
  const signature = crypto.createHmac('sha256', ACCESS_KEY_SECRET)
    .update(signatureString)
    .digest('hex');
  
  // Return authentication token
  return `KlingAI ${ACCESS_KEY_ID}:${timestamp}:${nonce}:${signature}`;
}

/**
 * Generate video using Kling AI API
 * @param {string} prompt - Text prompt for video generation
 * @param {object} options - Additional options for video generation
 * @returns {Promise<object>} Generated video information
 */
async function generateVideo(prompt, options = {}) {
  try {
    console.log(`Generating video with prompt: ${prompt}`);
    
    // Check if API credentials are available
    if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET) {
      throw new Error('Kling AI API credentials not found in environment variables. Please set KLING_API_KEY_ID and KLING_API_KEY_SECRET.');
    }
    
    // Extract keywords from prompt for better video generation
    const keywords = extractKeywords(prompt);
    console.log(`Extracted keywords: ${keywords.join(', ')}`);
    
    // Enhance prompt with keywords if needed
    const enhancedPrompt = options.enhancePrompt ? 
      `${prompt} (Keywords: ${keywords.join(', ')})` : prompt;
    
    // Set default options
    const defaultOptions = {
      aspectRatio: '16:9',
      duration: 10, // seconds
      model_name: 'v1', // Default model version
      external_task_id: `task_${Date.now()}` // Unique task ID
    };
    
    // Merge default options with provided options
    const videoOptions = { ...defaultOptions, ...options };
    
    // Prepare request body
    const requestBody = {
      prompt: enhancedPrompt,
      aspect_ratio: videoOptions.aspectRatio,
      duration: videoOptions.duration,
      model_name: videoOptions.model_name,
      external_task_id: videoOptions.external_task_id
    };
    
    // Generate authentication token
    const authToken = generateAuthToken();
    
    // Make API request to Kling AI
    const response = await axios.post(KLING_API_ENDPOINT, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken
      }
    });
    
    // Check if request was successful
    if (response.data && response.data.code === 0) {
      const taskId = response.data.data[0].task_id;
      console.log(`Video generation task submitted successfully. Task ID: ${taskId}`);
      
      // Return task information
      return {
        taskId: taskId,
        status: 'submitted',
        message: 'Video generation task submitted successfully',
        keywords: keywords
      };
    } else {
      throw new Error(`Failed to submit video generation task: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error generating video:', error.message);
    
    // Return error information
    return {
      status: 'error',
      message: `Failed to generate video: ${error.message}`,
      error: error
    };
  }
}

/**
 * Check status of video generation task
 * @param {string} taskId - Task ID to check
 * @returns {Promise<object>} Task status information
 */
async function checkVideoStatus(taskId) {
  try {
    console.log(`Checking status for task: ${taskId}`);
    
    // Check if API credentials are available
    if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET) {
      throw new Error('Kling AI API credentials not found in environment variables. Please set KLING_API_KEY_ID and KLING_API_KEY_SECRET.');
    }
    
    // Generate authentication token
    const authToken = generateAuthToken();
    
    // Make API request to check task status
    const response = await axios.get(`https://app.klingai.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': authToken
      }
    });
    
    // Check if request was successful
    if (response.data && response.data.code === 0) {
      const taskData = response.data.data[0];
      console.log(`Task status: ${taskData.task_status}`);
      
      // If task is completed, return video URL
      if (taskData.task_status === 'succeed') {
        const videoUrl = taskData.task_result.videos[0].url;
        const videoDuration = taskData.task_result.videos[0].duration;
        
        return {
          status: 'completed',
          message: 'Video generation completed successfully',
          videoUrl: videoUrl,
          videoDuration: videoDuration
        };
      }
      
      // If task failed, return error message
      if (taskData.task_status === 'failed') {
        return {
          status: 'failed',
          message: `Video generation failed: ${taskData.task_status_msg}`
        };
      }
      
      // If task is still processing, return status
      return {
        status: 'processing',
        message: 'Video generation is still in progress'
      };
    } else {
      throw new Error(`Failed to check task status: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error checking video status:', error.message);
    
    // Return error information
    return {
      status: 'error',
      message: `Failed to check video status: ${error.message}`,
      error: error
    };
  }
}

/**
 * Generate a video with fallback to mock response if API fails
 * @param {string} prompt - Text prompt for video generation
 * @param {object} options - Additional options for video generation
 * @returns {Promise<object>} Generated video information
 */
async function generateVideoWithFallback(prompt, options = {}) {
  try {
    // Try to generate video using Kling AI API
    const result = await generateVideo(prompt, options);
    
    // If successful, return result
    if (result.status !== 'error') {
      return result;
    }
    
    // If API call failed, use fallback with stock videos based on keywords
    console.log('Using fallback with stock videos based on keywords');
    
    // Extract keywords from prompt
    const keywords = extractKeywords(prompt);
    
    // Generate mock video URL based on keywords
    const mockVideoUrl = generateMockVideoUrl(keywords);
    
    // Return mock response
    return {
      status: 'completed',
      message: 'Video generated using fallback mechanism',
      videoUrl: mockVideoUrl,
      videoDuration: '10',
      keywords: keywords,
      isMock: true
    };
  } catch (error) {
    console.error('Error in generateVideoWithFallback:', error.message);
    
    // Return error information
    return {
      status: 'error',
      message: `Failed to generate video: ${error.message}`,
      error: error
    };
  }
}

/**
 * Generate a mock video URL based on keywords
 * @param {string[]} keywords - Keywords extracted from prompt
 * @returns {string} Mock video URL
 */
function generateMockVideoUrl(keywords) {
  // Sample stock videos for different categories
  const stockVideos = {
    nature: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    technology: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    people: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    business: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    food: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    travel: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    sports: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    default: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  };
  
  // Map keywords to categories
  const categoryKeywords = {
    nature: ['nature', 'landscape', 'mountain', 'ocean', 'forest', 'river', 'lake', 'beach', 'sky', 'sunset', 'sunrise'],
    technology: ['technology', 'computer', 'digital', 'tech', 'innovation', 'future', 'robot', 'ai', 'artificial intelligence'],
    people: ['people', 'person', 'man', 'woman', 'child', 'family', 'group', 'crowd', 'human'],
    business: ['business', 'office', 'work', 'meeting', 'corporate', 'professional', 'company', 'startup'],
    food: ['food', 'meal', 'restaurant', 'cooking', 'kitchen', 'chef', 'recipe', 'dish', 'cuisine'],
    travel: ['travel', 'vacation', 'trip', 'journey', 'adventure', 'tourism', 'destination', 'explore'],
    sports: ['sports', 'athlete', 'game', 'competition', 'fitness', 'exercise', 'workout', 'training']
  };
  
  // Find matching category based on keywords
  for (const keyword of keywords) {
    for (const [category, categoryKeywordList] of Object.entries(categoryKeywords)) {
      if (categoryKeywordList.includes(keyword.toLowerCase())) {
        return stockVideos[category];
      }
    }
  }
  
  // Return default video if no matching category found
  return stockVideos.default;
}

/**
 * Extract keywords from text if extractKeywords function is not available
 * @param {string} text - Text to extract keywords from
 * @returns {string[]} Extracted keywords
 */
function extractKeywords(text) {
  // Simple keyword extraction if the imported function is not available
  if (typeof extractKeywords !== 'function') {
    // Remove common words and punctuation
    const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of'];
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    // Filter out common words and short words
    const keywords = words.filter(word => 
      word.length > 3 && !commonWords.includes(word)
    );
    
    // Return unique keywords
    return [...new Set(keywords)];
  }
  
  // Use the imported function if available
  return extractKeywords(text);
}

module.exports = {
  generateVideo,
  checkVideoStatus,
  generateVideoWithFallback,
  extractKeywords
};
